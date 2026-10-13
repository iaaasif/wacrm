import { describe, it, expect } from 'vitest';
import { STARTER_TEMPLATES } from './starter-templates';
import { validateTemplatePayload } from './template-validators';

describe('Starter Message Templates', () => {
  it('contains at least 8 predefined templates', () => {
    expect(STARTER_TEMPLATES.length).toBeGreaterThanOrEqual(8);
  });

  it('all starter templates pass strict Meta validation', () => {
    for (const template of STARTER_TEMPLATES) {
      expect(() => {
        validateTemplatePayload({
          name: template.name,
          category: template.category,
          language: template.language,
          header_type: template.header_type,
          header_content: template.header_content,
          body_text: template.body_text,
          footer_text: template.footer_text,
          buttons: template.buttons,
          sample_values: template.sample_values,
        });
      }).not.toThrow();
    }
  });

  it('has unique template names', () => {
    const names = STARTER_TEMPLATES.map((t) => t.name);
    const uniqueNames = new Set(names);
    expect(uniqueNames.size).toBe(names.length);
  });

  it('all sample values match body variable count', () => {
    for (const template of STARTER_TEMPLATES) {
      const vars = template.body_text.match(/\{\{(\d+)\}\}/g) || [];
      const varCount = new Set(vars).size;
      if (varCount > 0) {
        expect(template.sample_values?.body?.length).toBe(varCount);
      }
    }
  });
});
