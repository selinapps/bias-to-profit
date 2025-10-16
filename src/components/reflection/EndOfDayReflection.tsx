import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Brain, Save, CheckCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface EndOfDayReflectionData {
  whatWentWell: string;
  whatToImprove: string;
}

interface EndOfDayReflectionProps {
  selectedDate: Date;
  onSave?: () => void;
}

export function EndOfDayReflection({ selectedDate, onSave }: EndOfDayReflectionProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reflection, setReflection] = useState<EndOfDayReflectionData>({
    whatWentWell: '',
    whatToImprove: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Load existing reflection data for the selected date
  const loadReflection = useCallback(async () => {
    if (!user) {
      console.log('No user available, skipping reflection load');
      return;
    }

    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      
      // First try to load from localStorage as fallback
      const localStorageKey = `reflection_${user.id}_${dateStr}`;
      const localReflection = localStorage.getItem(localStorageKey);
      
      if (localReflection) {
        const parsed = JSON.parse(localReflection);
        setReflection({
          whatWentWell: parsed.whatWentWell || '',
          whatToImprove: parsed.whatToImprove || ''
        });
        setIsSaved(true);
        setHasUnsavedChanges(false);
        console.log('Loaded reflection from localStorage');
      }
      
      // TEMPORARILY DISABLED: Database queries causing 406 errors
      // TODO: Re-enable when authentication is properly working
      console.log('Database queries temporarily disabled to prevent 406 errors');
    } catch (error) {
      console.error('Error loading reflection:', error);
      toast({
        title: 'Warning',
        description: 'Using local storage for reflections',
        variant: 'default',
      });
    }
  }, [user, selectedDate]);

  // Save reflection data
  const saveReflection = useCallback(async () => {
    if (!user) {
      console.log('No user available, skipping reflection save');
      return;
    }

    setIsSaving(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      
      console.log('Saving reflection for date:', dateStr);
      console.log('Reflection data:', reflection);
      
      // Always save to localStorage first as backup
      const localStorageKey = `reflection_${user.id}_${dateStr}`;
      localStorage.setItem(localStorageKey, JSON.stringify(reflection));
      console.log('Saved to localStorage');
      
      // TEMPORARILY DISABLED: Database save to prevent 406 errors
      // TODO: Re-enable when authentication is properly working
      console.log('Database save temporarily disabled to prevent 406 errors');
      toast({
        title: 'Saved Locally',
        description: 'Reflection saved to local storage (database temporarily disabled)',
      });
      
      setIsSaved(true);
      setHasUnsavedChanges(false);

      if (onSave) {
        onSave();
      }
    } catch (error) {
      console.error('Error saving reflection:', error);
      toast({
        title: 'Error',
        description: `Failed to save reflection: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  }, [user, selectedDate, reflection, onSave]);

  const handleInputChange = (field: keyof EndOfDayReflectionData, value: string) => {
    setReflection(prev => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
    setIsSaved(false);
  };

  useEffect(() => {
    loadReflection();
  }, [selectedDate, user, loadReflection]);

  // Don't render if no user is available
  if (!user) {
    return null;
  }

  return (
    <Card className="bg-background border-trading-border">
      <CardHeader>
        <CardTitle className="text-sm text-trading-muted flex items-center gap-2">
          <Brain className="h-4 w-4" />
          End-of-Day Reflection
          {isSaved && (
            <CheckCircle className="h-4 w-4 text-green-500" />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium">What went well today?</Label>
            <Textarea
              placeholder="Reflect on your successes and good decisions..."
              value={reflection.whatWentWell}
              onChange={(e) => handleInputChange('whatWentWell', e.target.value)}
              className="mt-1 min-h-20 bg-secondary/50 border-purple-400/50 focus:border-purple-400 resize-none text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <div>
            <Label className="text-sm font-medium">What to improve tomorrow?</Label>
            <Textarea
              placeholder="Identify areas for improvement and tomorrow's focus..."
              value={reflection.whatToImprove}
              onChange={(e) => handleInputChange('whatToImprove', e.target.value)}
              className="mt-1 min-h-20 bg-secondary/50 border-amber-400/50 focus:border-amber-400 resize-none text-foreground placeholder:text-muted-foreground"
            />
          </div>
          
          {/* Save Button */}
          <div className="flex justify-between items-center pt-2">
            <div className="text-sm text-muted-foreground">
              {hasUnsavedChanges && (
                <span className="text-amber-600">• Unsaved changes</span>
              )}
              {isSaved && !hasUnsavedChanges && (
                <span className="text-green-600 flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Saved successfully
                </span>
              )}
            </div>
            <Button
              onClick={saveReflection}
              disabled={isSaving || (!hasUnsavedChanges && isSaved)}
              variant={hasUnsavedChanges ? "default" : "outline"}
              size="sm"
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {isSaving ? 'Saving...' : isSaved ? 'Saved' : 'Save Reflection'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
