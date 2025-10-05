import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, Lightbulb, Target, TrendingUp, BarChart3, Clock } from 'lucide-react';

export function HypothesisMode() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center py-8">
        <div className="flex items-center justify-center mb-4">
          <div className="p-4 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-full">
            <Brain className="h-12 w-12 text-purple-400" />
          </div>
        </div>
        <h2 className="text-3xl font-bold text-foreground mb-2">Hypothesis Mode</h2>
        <p className="text-lg text-trading-muted max-w-2xl mx-auto">
          Test your trading theories and validate patterns with data-driven insights
        </p>
      </div>

      {/* Coming Soon Card */}
      <Card className="bg-gradient-to-br from-trading-card to-trading-card/80 border-trading-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-400" />
            Feature Development
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-center py-8">
              <div className="text-6xl mb-4">🚀</div>
              <h3 className="text-xl font-semibold mb-2">Coming Soon!</h3>
              <p className="text-trading-muted mb-6">
                We're building powerful hypothesis testing tools to help you validate your trading strategies.
              </p>
            </div>

            {/* Planned Features */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-background/50 border border-trading-border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-4 w-4 text-trading-accent" />
                  <span className="font-medium">Strategy Testing</span>
                </div>
                <p className="text-sm text-trading-muted">
                  Test specific trading hypotheses with historical data
                </p>
              </div>

              <div className="bg-background/50 border border-trading-border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="h-4 w-4 text-trading-accent" />
                  <span className="font-medium">Pattern Recognition</span>
                </div>
                <p className="text-sm text-trading-muted">
                  Identify and validate recurring market patterns
                </p>
              </div>

              <div className="bg-background/50 border border-trading-border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-trading-accent" />
                  <span className="font-medium">Performance Analysis</span>
                </div>
                <p className="text-sm text-trading-muted">
                  Analyze strategy performance across different market conditions
                </p>
              </div>

              <div className="bg-background/50 border border-trading-border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-trading-accent" />
                  <span className="font-medium">Time-based Studies</span>
                </div>
                <p className="text-sm text-trading-muted">
                  Study performance across different timeframes and sessions
                </p>
              </div>
            </div>

            {/* Notification Signup */}
            <div className="mt-6 p-4 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-lg">
              <div className="text-center">
                <h4 className="font-semibold mb-2">Get Notified</h4>
                <p className="text-sm text-trading-muted mb-4">
                  We'll notify you when Hypothesis Mode is ready
                </p>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="hover:bg-trading-accent/10"
                  disabled
                >
                  <Brain className="h-4 w-4 mr-2" />
                  Notify Me (Coming Soon)
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Analytics */}
      <Card className="bg-trading-card border-trading-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-trading-accent" />
            Available Now
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p className="text-sm text-trading-muted mb-4">
              While we're building Hypothesis Mode, you can use our current analytics tools:
            </p>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-background/50 rounded-lg border border-trading-border">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-sm font-medium">Trading Analytics</span>
                </div>
                <Badge variant="outline" className="text-xs">Available</Badge>
              </div>

              <div className="flex items-center justify-between p-3 bg-background/50 rounded-lg border border-trading-border">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-sm font-medium">Trading Calendar</span>
                </div>
                <Badge variant="outline" className="text-xs">Available</Badge>
              </div>

              <div className="flex items-center justify-between p-3 bg-background/50 rounded-lg border border-trading-border">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-sm font-medium">Trade Heatmap</span>
                </div>
                <Badge variant="outline" className="text-xs">Available</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
