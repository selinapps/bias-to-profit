import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Edit2, Save, X, CheckCircle2 } from 'lucide-react';
import { useSettings } from '@/hooks/useSettings';
import { useToast } from '@/hooks/use-toast';

interface SetupManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SetupManager({ isOpen, onClose }: SetupManagerProps) {
  const { settings, updateSetting } = useSettings();
  const { toast } = useToast();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  
  // Form state for creating/editing
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formChecklist, setFormChecklist] = useState<string[]>([]);
  const [newChecklistItem, setNewChecklistItem] = useState('');

  const startCreating = () => {
    setIsCreating(true);
    setFormName('');
    setFormDescription('');
    setFormChecklist([]);
    setNewChecklistItem('');
  };

  const startEditing = (setupId: string) => {
    const setup = settings.customSetups.find(s => s.id === setupId);
    if (setup) {
      setEditingId(setupId);
      setFormName(setup.name);
      setFormDescription(setup.description || '');
      setFormChecklist(setup.checklist || []);
      setNewChecklistItem('');
    }
  };

  const cancelEditing = () => {
    setEditingId(null);
    setIsCreating(false);
    setFormName('');
    setFormDescription('');
    setFormChecklist([]);
    setNewChecklistItem('');
  };

  const addChecklistItem = () => {
    if (newChecklistItem.trim()) {
      setFormChecklist([...formChecklist, newChecklistItem.trim()]);
      setNewChecklistItem('');
    }
  };

  const removeChecklistItem = (index: number) => {
    setFormChecklist(formChecklist.filter((_, i) => i !== index));
  };

  const saveSetup = async () => {
    if (!formName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter a name for your setup.",
        variant: "destructive"
      });
      return;
    }

    const newSetup = {
      id: editingId || `setup-${Date.now()}`,
      name: formName.trim(),
      description: formDescription.trim() || undefined,
      checklist: formChecklist.length > 0 ? formChecklist : undefined
    };

    let updatedSetups;
    if (editingId) {
      // Update existing
      updatedSetups = settings.customSetups.map(s => 
        s.id === editingId ? newSetup : s
      );
    } else {
      // Add new
      updatedSetups = [...settings.customSetups, newSetup];
    }

    await updateSetting('customSetups', updatedSetups);
    
    toast({
      title: editingId ? "Setup Updated" : "Setup Created",
      description: `"${newSetup.name}" has been saved successfully.`,
    });

    cancelEditing();
  };

  const deleteSetup = async (setupId: string) => {
    const setup = settings.customSetups.find(s => s.id === setupId);
    if (!setup) return;

    if (confirm(`Are you sure you want to delete "${setup.name}"?`)) {
      const updatedSetups = settings.customSetups.filter(s => s.id !== setupId);
      await updateSetting('customSetups', updatedSetups);
      
      toast({
        title: "Setup Deleted",
        description: `"${setup.name}" has been removed.`,
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-2xl text-slate-100">Manage Trading Setups</DialogTitle>
          <DialogDescription className="text-slate-400">
            Create and manage your custom trading setups with checklists
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          {/* Create New Button */}
          {!isCreating && !editingId && (
            <Button 
              onClick={startCreating}
              className="w-full h-12 bg-emerald-600 hover:bg-emerald-500"
            >
              <Plus className="h-5 w-5 mr-2" />
              Create New Setup
            </Button>
          )}

          {/* Create/Edit Form */}
          {(isCreating || editingId) && (
            <Card className="p-6 bg-slate-800 border-slate-700 space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-100">
                  {editingId ? 'Edit Setup' : 'Create New Setup'}
                </h3>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={cancelEditing}
                  className="text-slate-400 hover:text-slate-200"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Name */}
              <div>
                <Label htmlFor="setup-name" className="text-slate-300">Setup Name *</Label>
                <Input
                  id="setup-name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g., Breakout, Pullback, Reversal..."
                  className="mt-1 bg-slate-900 border-slate-700"
                />
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="setup-description" className="text-slate-300">Description (Optional)</Label>
                <Textarea
                  id="setup-description"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Brief description of this setup..."
                  className="mt-1 bg-slate-900 border-slate-700"
                  rows={2}
                />
              </div>

              {/* Checklist */}
              <div>
                <Label className="text-slate-300 mb-2 block">Checklist Items (Optional)</Label>
                
                {/* Existing checklist items */}
                {formChecklist.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {formChecklist.map((item, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-slate-900 rounded border border-slate-700">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                        <span className="flex-1 text-sm text-slate-300">{item}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeChecklistItem(index)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add new checklist item */}
                <div className="flex gap-2">
                  <Input
                    value={newChecklistItem}
                    onChange={(e) => setNewChecklistItem(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addChecklistItem()}
                    placeholder="Add a checklist item..."
                    className="bg-slate-900 border-slate-700"
                  />
                  <Button 
                    onClick={addChecklistItem}
                    variant="outline"
                    className="border-slate-700"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Save Button */}
              <Button 
                onClick={saveSetup}
                disabled={!formName.trim()}
                className="w-full bg-blue-600 hover:bg-blue-500"
              >
                <Save className="h-4 w-4 mr-2" />
                {editingId ? 'Update Setup' : 'Create Setup'}
              </Button>
            </Card>
          )}

          {/* Existing Setups List */}
          {!isCreating && !editingId && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-slate-100 mb-3">
                Your Setups ({settings.customSetups.length})
              </h3>
              
              {settings.customSetups.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <p className="mb-2">No setups created yet</p>
                  <p className="text-sm">Click "Create New Setup" to get started</p>
                </div>
              ) : (
                settings.customSetups.map((setup) => (
                  <Card key={setup.id} className="p-4 bg-slate-800 border-slate-700">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="text-lg font-semibold text-slate-100">{setup.name}</h4>
                          {setup.checklist && setup.checklist.length > 0 && (
                            <Badge variant="secondary" className="bg-slate-700">
                              {setup.checklist.length} checks
                            </Badge>
                          )}
                        </div>
                        
                        {setup.description && (
                          <p className="text-sm text-slate-400 mb-3">{setup.description}</p>
                        )}

                        {setup.checklist && setup.checklist.length > 0 && (
                          <div className="space-y-1">
                            {setup.checklist.map((item, index) => (
                              <div key={index} className="flex items-start gap-2 text-sm text-slate-300">
                                <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                                <span>{item}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 ml-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEditing(setup.id)}
                          className="text-blue-400 hover:text-blue-300"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteSetup(setup.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

