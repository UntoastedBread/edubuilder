'use client';

import { ToastProvider } from '@/components/ui/Toast';
import { ModeProvider } from '@/lib/ModeContext';
import { I18nProvider } from '@/lib/I18nContext';
import { ThemeProvider } from '@/lib/ThemeContext';
import Onboarding from '@/components/Onboarding';
import KeyboardShortcuts from '@/components/ui/KeyboardShortcuts';

export default function Providers({ children }) {
  return (
    <ThemeProvider>
      <ModeProvider>
        <I18nProvider>
          <ToastProvider>
            {children}
            <Onboarding />
            <KeyboardShortcuts />
          </ToastProvider>
        </I18nProvider>
      </ModeProvider>
    </ThemeProvider>
  );
}
