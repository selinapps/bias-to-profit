import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Upload, FileText, CheckCircle, AlertCircle, Download } from 'lucide-react';
import { parseCTraderCSV, calculateStopLossFromRisk } from '@/lib/ctraderImport';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';

interface CTraderImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete?: () => void;
}

interface ParsedTradePreview {
  tradeId: string;
  symbol: string;
  direction: 'long' | 'short';
  volume: number;
  entryPrice: number;
  exitPrice?: number;
  entryTime: string;
  exitTime?: string;
  grossProfit?: number;
  commission?: number;
  swap?: number;
  netProfit?: number;
  stopLoss: number;
  takeProfit?: number;
  durationMinutes?: number;
  willImport: boolean;
  mappedModel: 'trend' | 'mean_reversion';
  mappedRiskTier: 'a' | 'b' | 'c';
  mappedRiskAmount: number;
}

export function CTraderImportModal({ isOpen, onClose, onImportComplete }: CTraderImportModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [file, setFile] = useState<File | null>(null);
  const [parsedTrades, setParsedTrades] = useState<ParsedTradePreview[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importComplete, setImportComplete] = useState(false);
  const [importStats, setImportStats] = useState({ success: 0, failed: 0 });

  // Default mapping settings
  const [defaultModel, setDefaultModel] = useState<'trend' | 'mean_reversion'>('trend');
  const [defaultRiskTier, setDefaultRiskTier] = useState<'a' | 'b' | 'c'>('b');
  const [defaultRiskAmount, setDefaultRiskAmount] = useState(100);
  const [tradeDate, setTradeDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      toast({
        title: "Invalid File",
        description: "Please select a CSV file exported from cTrader.",
        variant: "destructive"
      });
      return;
    }

    setFile(selectedFile);

    try {
      const text = await selectedFile.text();
      const trades = parseCTraderCSV(text);
      
      if (trades.length === 0) {
        toast({
          title: "No Trades Found",
          description: "The CSV file doesn't contain any valid trades.",
          variant: "destructive"
        });
        return;
      }

      // Create preview with default mappings
      const previews: ParsedTradePreview[] = trades.map(trade => ({
        ...trade,
        willImport: true,
        mappedModel: defaultModel,
        mappedRiskTier: defaultRiskTier,
        mappedRiskAmount: defaultRiskAmount
      }));

      setParsedTrades(previews);
      
      toast({
        title: "File Parsed",
        description: `Found ${trades.length} trade${trades.length > 1 ? 's' : ''} in the file.`,
      });
    } catch (error) {
      console.error('Parse error:', error);
      toast({
        title: "Parse Error",
        description: "Failed to parse the CSV file. Please check the format.",
        variant: "destructive"
      });
    }
  };

  const handleImport = async () => {
    if (!user || parsedTrades.length === 0) return;

    setIsImporting(true);
    let successCount = 0;
    let failCount = 0;

    const tradesToImport = parsedTrades.filter(t => t.willImport);

    for (const trade of tradesToImport) {
      try {
        // Calculate proper stop loss based on user's risk amount
        const calculatedStopLoss = calculateStopLossFromRisk(
          trade.entryPrice,
          trade.volume,
          trade.mappedRiskAmount,
          trade.direction,
          trade.symbol
        );

        // Apply the selected trade date to the times
        const selectedDate = new Date(tradeDate);
        const entryDateTime = new Date(trade.entryTime);
        const exitDateTime = trade.exitTime ? new Date(trade.exitTime) : null;
        
        // Combine selected date with parsed times
        entryDateTime.setFullYear(selectedDate.getFullYear());
        entryDateTime.setMonth(selectedDate.getMonth());
        entryDateTime.setDate(selectedDate.getDate());
        
        if (exitDateTime) {
          exitDateTime.setFullYear(selectedDate.getFullYear());
          exitDateTime.setMonth(selectedDate.getMonth());
          exitDateTime.setDate(selectedDate.getDate());
        }

        const tradeData = {
          user_id: user.id,
          asset: trade.symbol,
          direction: trade.direction,
          model: trade.mappedModel,
          entry_price: trade.entryPrice,
          stop_loss: calculatedStopLoss, // Use calculated SL based on risk amount
          exit_price: trade.exitPrice || null,
          entry_time: entryDateTime.toISOString(),
          exit_time: exitDateTime ? exitDateTime.toISOString() : null,
          lot_size: trade.volume,
          pnl: trade.netProfit,
          risk_tier: trade.mappedRiskTier,
          risk_amount: trade.mappedRiskAmount,
          status: trade.exitPrice ? 'closed' : 'open', // Use exitPrice to determine status
          duration_minutes: trade.durationMinutes,
          notes: `Imported from cTrader - Trade ID: ${trade.tradeId}`,
          locations: [],
          aggression: null,
          scenarios: [],
          emotions: {},
          externals: [],
          mistake_tags: [],
          is_experimental: false
        };

        const { error } = await supabase
          .from('trades')
          .insert(tradeData);

        if (error) {
          console.error('Insert error:', error);
          failCount++;
        } else {
          successCount++;
        }
      } catch (error) {
        console.error('Trade import error:', error);
        failCount++;
      }
    }

    setImportStats({ success: successCount, failed: failCount });
    setImportComplete(true);
    setIsImporting(false);

    toast({
      title: "Import Complete",
      description: `Successfully imported ${successCount} trade${successCount > 1 ? 's' : ''}${failCount > 0 ? `. ${failCount} failed.` : '.'}`,
      variant: successCount > 0 ? "default" : "destructive"
    });

    if (onImportComplete) {
      onImportComplete();
    }
  };

  const handleClose = () => {
    setFile(null);
    setParsedTrades([]);
    setImportComplete(false);
    setImportStats({ success: 0, failed: 0 });
    onClose();
  };

  const toggleTradeImport = (index: number) => {
    setParsedTrades(prev => prev.map((t, i) => 
      i === index ? { ...t, willImport: !t.willImport } : t
    ));
  };

  const updateTradeMapping = (index: number, field: 'mappedModel' | 'mappedRiskTier' | 'mappedRiskAmount', value: any) => {
    setParsedTrades(prev => prev.map((t, i) => 
      i === index ? { ...t, [field]: value } : t
    ));
  };

  const downloadSampleCSV = () => {
    const sampleCSV = `Trade ID,Symbol,Direction,Volume,Entry Price,Exit Price,Entry Time,Exit Time,Gross Profit,Commission,Swap,Net Profit
12345,EURUSD,Buy,1.0,1.09500,1.09650,2024-01-15 09:30:00,2024-01-15 12:45:00,150.00,-7.50,-2.00,140.50
12346,GBPUSD,Sell,0.5,1.27800,1.27650,2024-01-15 14:20:00,2024-01-15 16:30:00,75.00,-3.75,-1.00,70.25
12347,USDJPY,Buy,2.0,148.500,149.200,2024-01-16 08:00:00,2024-01-16 11:15:00,280.00,-14.00,-3.50,262.50`;

    const blob = new Blob([sampleCSV], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ctrader-sample-format.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Import Trades from cTrader
          </DialogTitle>
          <DialogDescription>
            Upload a CSV file exported from cTrader to import your trading history.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-y-auto min-h-0">
          {!importComplete && (
            <>
              {/* File Upload Area */}
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                
                {!file ? (
                  <div className="space-y-3">
                    <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Click to upload or drag and drop</p>
                      <p className="text-xs text-muted-foreground mt-1">CSV file from cTrader</p>
                    </div>
                    <Button 
                      onClick={() => fileInputRef.current?.click()}
                      variant="outline"
                    >
                      Select File
                    </Button>
                    <div className="pt-2">
                      <Button
                        onClick={downloadSampleCSV}
                        variant="ghost"
                        size="sm"
                        className="text-xs"
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Download Sample Format
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <CheckCircle className="h-8 w-8 mx-auto text-green-500" />
                    <p className="text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{parsedTrades.length} trades found</p>
                    <Button 
                      onClick={() => {
                        setFile(null);
                        setParsedTrades([]);
                      }}
                      variant="outline"
                      size="sm"
                    >
                      Change File
                    </Button>
                  </div>
                )}
              </div>

              {/* Default Mapping Settings */}
              {parsedTrades.length > 0 && (
                <Card className="p-4">
                  <h3 className="text-sm font-semibold mb-3">Import Settings</h3>
                  
                  {/* Trade Date Selector */}
                  <div className="mb-4 p-3 bg-muted/50 rounded-md">
                    <Label className="text-xs font-semibold">Trade Date</Label>
                    <p className="text-xs text-muted-foreground mb-2">Your CSV only has time, not dates. When were these trades taken?</p>
                    <input
                      type="date"
                      value={tradeDate}
                      onChange={(e) => setTradeDate(e.target.value)}
                      className="h-10 text-sm bg-input border-trading-border text-foreground focus:border-trading-accent focus:ring-trading-accent/20 [&::-webkit-calendar-picker-indicator]:opacity-100 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:w-4 [&::-webkit-calendar-picker-indicator]:h-4 [&::-webkit-calendar-picker-indicator]:ml-2"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label className="text-xs">Default Model</Label>
                      <Select value={defaultModel} onValueChange={(v: any) => setDefaultModel(v)}>
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="trend">Trend</SelectItem>
                          <SelectItem value="mean_reversion">Mean Reversion</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Default Risk Tier</Label>
                      <Select value={defaultRiskTier} onValueChange={(v: any) => setDefaultRiskTier(v)}>
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="a">Tier A</SelectItem>
                          <SelectItem value="b">Tier B</SelectItem>
                          <SelectItem value="c">Tier C</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Default Risk Amount</Label>
                      <input
                        type="number"
                        value={defaultRiskAmount}
                        onChange={(e) => setDefaultRiskAmount(Number(e.target.value))}
                        className="h-9 w-full px-3 rounded-md border border-input bg-background text-sm"
                      />
                    </div>
                  </div>
                  <Button 
                    onClick={() => {
                      setParsedTrades(prev => prev.map(t => ({
                        ...t,
                        mappedModel: defaultModel,
                        mappedRiskTier: defaultRiskTier,
                        mappedRiskAmount: defaultRiskAmount
                      })));
                    }}
                    variant="outline"
                    size="sm"
                    className="mt-3"
                  >
                    Apply to All Trades
                  </Button>
                </Card>
              )}

              {/* Trade Preview */}
              {parsedTrades.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Trade Preview ({parsedTrades.filter(t => t.willImport).length} selected)</h3>
                  </div>
                  
                  <div className="border rounded-lg max-h-[400px] overflow-y-auto">
                    <div className="p-2 space-y-2">
                      {parsedTrades.map((trade, index) => {
                        // Calculate SL in real-time based on current risk amount
                        const calculatedSL = calculateStopLossFromRisk(
                          trade.entryPrice,
                          trade.volume,
                          trade.mappedRiskAmount,
                          trade.direction,
                          trade.symbol
                        );
                        
                        return (
                        <Card key={index} className={`p-3 ${!trade.willImport ? 'opacity-50' : ''}`}>
                          <div className="flex items-start gap-3">
                            <Checkbox
                              checked={trade.willImport}
                              onCheckedChange={() => toggleTradeImport(index)}
                              className="mt-1"
                            />
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant={trade.direction === 'long' ? 'default' : 'destructive'}>
                                  {trade.direction.toUpperCase()}
                                </Badge>
                                <span className="font-semibold">{trade.symbol}</span>
                                <span className="text-xs text-muted-foreground">Vol: {trade.volume}</span>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(trade.entryTime).toLocaleDateString()}
                                </span>
                                {trade.netProfit !== undefined && (
                                  <Badge variant={trade.netProfit >= 0 ? 'outline' : 'destructive'}>
                                    {trade.netProfit >= 0 ? '+' : ''}{trade.netProfit.toFixed(2)}
                                  </Badge>
                                )}
                              </div>
                              
                              <div className="grid grid-cols-3 gap-2 text-xs">
                                <div>
                                  <span className="text-muted-foreground">Entry: </span>
                                  <span className="font-mono">{trade.entryPrice.toFixed(5)}</span>
                                </div>
                                {trade.exitPrice && (
                                  <div>
                                    <span className="text-muted-foreground">Exit: </span>
                                    <span className="font-mono">{trade.exitPrice.toFixed(5)}</span>
                                  </div>
                                )}
                                <div>
                                  <span className="text-muted-foreground">SL: </span>
                                  <span className="font-mono text-primary">{calculatedSL.toFixed(5)}</span>
                                </div>
                              </div>

                              {/* Quick mapping controls */}
                              <div className="grid grid-cols-3 gap-2 pt-2 border-t">
                                <Select 
                                  value={trade.mappedModel} 
                                  onValueChange={(v: any) => updateTradeMapping(index, 'mappedModel', v)}
                                >
                                  <SelectTrigger className="h-7 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="trend">Trend</SelectItem>
                                    <SelectItem value="mean_reversion">Mean Rev</SelectItem>
                                  </SelectContent>
                                </Select>
                                <Select 
                                  value={trade.mappedRiskTier}
                                  onValueChange={(v: any) => updateTradeMapping(index, 'mappedRiskTier', v)}
                                >
                                  <SelectTrigger className="h-7 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="a">Tier A</SelectItem>
                                    <SelectItem value="b">Tier B</SelectItem>
                                    <SelectItem value="c">Tier C</SelectItem>
                                  </SelectContent>
                                </Select>
                                <input
                                  type="number"
                                  value={trade.mappedRiskAmount}
                                  onChange={(e) => updateTradeMapping(index, 'mappedRiskAmount', Number(e.target.value))}
                                  className="h-7 px-2 rounded-md border border-input bg-background text-xs"
                                  placeholder="Risk"
                                />
                              </div>
                            </div>
                          </div>
                        </Card>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Import Complete */}
          {importComplete && (
            <Card className="p-6 text-center">
              <CheckCircle className="h-16 w-16 mx-auto text-green-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Import Complete!</h3>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>Successfully imported: {importStats.success} trades</p>
                {importStats.failed > 0 && (
                  <p className="text-destructive">Failed: {importStats.failed} trades</p>
                )}
              </div>
            </Card>
          )}
        </div>

        <DialogFooter className="sticky bottom-0 bg-background border-t pt-4 mt-4">
          {!importComplete ? (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button 
                onClick={handleImport}
                disabled={parsedTrades.filter(t => t.willImport).length === 0 || isImporting}
                className="min-w-[200px]"
              >
                {isImporting ? 'Importing...' : `Import ${parsedTrades.filter(t => t.willImport).length} Trade${parsedTrades.filter(t => t.willImport).length > 1 ? 's' : ''}`}
              </Button>
            </>
          ) : (
            <Button onClick={handleClose}>
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

