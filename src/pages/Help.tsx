import React from 'react';
import { ModernCard, CardContent, CardHeader, CardTitle } from '@/components/ui/modern-card';

export default function HelpPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-on-surface mb-2">Help & Support</h1>
        <p className="text-on-surface-variant">Get help with your trading journal</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ModernCard interactive>
            <CardHeader>
              <CardTitle>Getting Started</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-on-surface-variant mb-4">Learn how to use your trading journal effectively</p>
              <ul className="space-y-2 text-sm text-on-surface-variant">
                <li>• Adding your first trade</li>
                <li>• Setting up risk management</li>
                <li>• Understanding analytics</li>
              </ul>
            </CardContent>
          </ModernCard>

          <ModernCard interactive>
            <CardHeader>
              <CardTitle>Keyboard Shortcuts</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-on-surface-variant mb-4">Speed up your workflow with these shortcuts</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Add Trade</span>
                  <kbd className="px-2 py-1 bg-surface-container rounded text-xs">Ctrl+N</kbd>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Toggle Theme</span>
                  <kbd className="px-2 py-1 bg-surface-container rounded text-xs">Ctrl+T</kbd>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Search</span>
                  <kbd className="px-2 py-1 bg-surface-container rounded text-xs">/</kbd>
                </div>
              </div>
            </CardContent>
          </ModernCard>

          <ModernCard interactive>
            <CardHeader>
              <CardTitle>FAQ</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-on-surface-variant mb-4">Frequently asked questions</p>
              <div className="space-y-3">
                <details className="group">
                  <summary className="cursor-pointer text-on-surface hover:text-primary transition-colors">
                    How do I export my data?
                  </summary>
                  <p className="text-sm text-on-surface-variant mt-2 ml-4">
                    Go to Settings → Privacy → Export Data to download your trading history.
                  </p>
                </details>
                <details className="group">
                  <summary className="cursor-pointer text-on-surface hover:text-primary transition-colors">
                    Can I use this on mobile?
                  </summary>
                  <p className="text-sm text-on-surface-variant mt-2 ml-4">
                    Yes! The app is fully responsive and works great on mobile devices.
                  </p>
                </details>
              </div>
            </CardContent>
          </ModernCard>

          <ModernCard interactive>
            <CardHeader>
              <CardTitle>Contact Support</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-on-surface-variant mb-4">Need help? We're here for you.</p>
              <div className="space-y-2">
                <button className="w-full text-left p-3 rounded-lg hover:bg-surface-container transition-colors">
                  <div className="font-medium text-on-surface">Email Support</div>
                  <div className="text-sm text-on-surface-variant">support@tradingjournal.com</div>
                </button>
                <button className="w-full text-left p-3 rounded-lg hover:bg-surface-container transition-colors">
                  <div className="font-medium text-on-surface">Live Chat</div>
                  <div className="text-sm text-on-surface-variant">Available 24/7</div>
                </button>
              </div>
            </CardContent>
          </ModernCard>
      </div>
    </div>
  );
}
