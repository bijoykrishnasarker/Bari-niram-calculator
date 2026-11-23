import React from 'react';
import {
  Text as RNText,
  type TextProps as RNTextProps,
} from 'react-native';

import enTranslations from './en.json';
import { useLanguage } from './LanguageContext';

export * from './LanguageContext';

export function Text({ children, style, ...props }: RNTextProps) {
  const { language } = useLanguage();

  if (language === 'bn') {
    return (
      <RNText style={style} {...props}>
        {children}
      </RNText>
    );
  }

  const translateChild = (child: React.ReactNode): React.ReactNode => {
    if (typeof child === 'string') {
      const trimmed = child.trim();
      const translation = (enTranslations as Record<string, string>)[trimmed];
      if (translation) {
        const leading = child.match(/^\s*/)?.[0] ?? '';
        const trailing = child.match(/\s*$/)?.[0] ?? '';
        return leading + translation + trailing;
      }
      return child;
    }
    if (Array.isArray(child)) {
      return React.Children.map(child, translateChild);
    }
    return child;
  };

  return (
    <RNText style={style} {...props}>
      {translateChild(children)}
    </RNText>
  );
}
