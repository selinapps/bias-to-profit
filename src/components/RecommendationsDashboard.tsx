import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Sparkles, RefreshCw, AlertCircle, Lightbulb, TrendingUp, CheckCircle2, BarChart3 } from 'lucide-react';
import { useRecommendations } from '@/hooks/useRecommendations';
import { RecommendationCard } from './RecommendationCard';

export function RecommendationsDashboard() {
  const {
    critical,
    high,
    medium,
    low,
    implemented,
    loading,
    generating,
    generateRecommendations,
    markAsImplemented,
    dismiss,
  } = useRecommendations();

  const totalActive = critical.length + high.length + medium.length + low.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-br from-purple-950/30 to-blue-950/30 border-purple-500/30">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <Sparkles className="h-8 w-8 text-purple-400" />
              <div>
                <CardTitle className="text-2xl">AI-Powered Recommendations</CardTitle>
                <CardDescription className="mt-1">
                  Data-driven insights to improve your trading performance
                </CardDescription>
              </div>
            </div>
            <Button
              onClick={generateRecommendations}
              disabled={generating || loading}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {generating ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate
                </>
              )}
            </Button>
          </div>
        </CardHeader>

        {totalActive > 0 && (
          <CardContent>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-muted-foreground">Active Recommendations:</span>
              {critical.length > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {critical.length} Critical
                </Badge>
              )}
              {high.length > 0 && (
                <Badge className="gap-1">
                  <TrendingUp className="h-3 w-3" />
                  {high.length} High
                </Badge>
              )}
              {medium.length + low.length > 0 && (
                <Badge variant="secondary" className="gap-1">
                  <Lightbulb className="h-3 w-3" />
                  {medium.length + low.length} Insights
                </Badge>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="critical" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="critical" className="gap-2">
            <AlertCircle className="h-4 w-4" />
            Critical
            {critical.length > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-xs">
                {critical.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="high" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            High Priority
            {high.length > 0 && (
              <Badge className="ml-1 h-5 px-1.5 text-xs">{high.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="insights" className="gap-2">
            <Lightbulb className="h-4 w-4" />
            Insights
            {medium.length + low.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {medium.length + low.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="implemented" className="gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Implemented
            {implemented.length > 0 && (
              <Badge variant="outline" className="ml-1 h-5 px-1.5 text-xs">
                {implemented.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Critical Tab */}
        <TabsContent value="critical" className="space-y-4">
          {loading ? (
            <Card>
              <CardContent className="flex items-center justify-center h-40">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </CardContent>
            </Card>
          ) : critical.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center h-40 text-center">
                <AlertCircle className="h-12 w-12 text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">No critical issues detected</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Click "Generate" to analyze your recent trading data
                </p>
              </CardContent>
            </Card>
          ) : (
            critical.map((rec) => (
              <RecommendationCard
                key={rec.id}
                recommendation={rec}
                onImplement={markAsImplemented}
                onDismiss={dismiss}
              />
            ))
          )}
        </TabsContent>

        {/* High Priority Tab */}
        <TabsContent value="high" className="space-y-4">
          {loading ? (
            <Card>
              <CardContent className="flex items-center justify-center h-40">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </CardContent>
            </Card>
          ) : high.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center h-40 text-center">
                <TrendingUp className="h-12 w-12 text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">No high-priority recommendations</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Your trading is on track! Check Insights for optimization ideas.
                </p>
              </CardContent>
            </Card>
          ) : (
            high.map((rec) => (
              <RecommendationCard
                key={rec.id}
                recommendation={rec}
                onImplement={markAsImplemented}
                onDismiss={dismiss}
              />
            ))
          )}
        </TabsContent>

        {/* Insights Tab (Medium + Low) */}
        <TabsContent value="insights" className="space-y-4">
          {loading ? (
            <Card>
              <CardContent className="flex items-center justify-center h-40">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </CardContent>
            </Card>
          ) : medium.length + low.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center h-40 text-center">
                <Lightbulb className="h-12 w-12 text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">No insights available yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Need more trading data (at least 10-15 trades) for meaningful insights
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {medium.map((rec) => (
                <RecommendationCard
                  key={rec.id}
                  recommendation={rec}
                  onImplement={markAsImplemented}
                  onDismiss={dismiss}
                />
              ))}
              {low.map((rec) => (
                <RecommendationCard
                  key={rec.id}
                  recommendation={rec}
                  onImplement={markAsImplemented}
                  onDismiss={dismiss}
                />
              ))}
            </>
          )}
        </TabsContent>

        {/* Implemented Tab */}
        <TabsContent value="implemented" className="space-y-4">
          {loading ? (
            <Card>
              <CardContent className="flex items-center justify-center h-40">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </CardContent>
            </Card>
          ) : implemented.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center h-40 text-center">
                <CheckCircle2 className="h-12 w-12 text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">No implemented recommendations yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Mark recommendations as implemented to track them here
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <Card className="bg-green-950/20 border-green-500/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-400" />
                    <div>
                      <p className="text-sm font-medium">Tracking {implemented.length} implemented changes</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Monitor your performance over the next 30 days to verify improvement
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {implemented.map((rec) => (
                <Card key={rec.id} className="opacity-75">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <CheckCircle2 className="h-5 w-5 mt-0.5 text-green-400 shrink-0" />
                        <div className="flex-1">
                          <CardTitle className="text-base leading-tight">{rec.title}</CardTitle>
                          <div className="flex items-center gap-2 flex-wrap mt-2">
                            <Badge variant="outline" className="text-xs">Implemented</Badge>
                            {rec.potential_impact !== null && rec.potential_impact !== 0 && (
                              <Badge variant="secondary" className="text-xs">
                                Expected: +{rec.potential_impact.toFixed(1)}R
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{rec.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

