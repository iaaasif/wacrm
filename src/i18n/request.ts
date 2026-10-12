import { getRequestConfig } from 'next-intl/server';
import enMessages from '../../messages/en.json';
import esMessages from '../../messages/es.json';
import koMessages from '../../messages/ko.json';
import ptMessages from '../../messages/pt.json';

const dictionaries: Record<string, any> = {
  en: enMessages,
  es: esMessages,
  ko: koMessages,
  pt: ptMessages,
};

export default getRequestConfig(async () => {
  // Read the locale from the environment, defaulting to 'en'
  const locale = process.env.NEXT_PUBLIC_APP_LOCALE || 'en';
  const messages = dictionaries[locale] || dictionaries.en;

  return {
    locale,
    messages,
  };
});
