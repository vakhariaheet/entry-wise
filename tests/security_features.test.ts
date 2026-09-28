import { describe, it, expect } from 'bun:test';
import { isDisposableEmail, containsSpamKeywords, anonymizeIpAddress } from '../src/utils/spamGuard';
import { escapeCsvCell } from '../src/utils/csv';

describe('SpamGuard: Disposable Email Blocker', () => {
  it('identifies and blocks known disposable email domains', () => {
    expect(isDisposableEmail('test@mailinator.com')).toBe(true);
    expect(isDisposableEmail('anon@guerrillamail.com')).toBe(true);
    expect(isDisposableEmail('spammer@10minutemail.com')).toBe(true);
    expect(isDisposableEmail('temp@yopmail.com')).toBe(true);
    expect(isDisposableEmail('throwaway@tempmail.com')).toBe(true);
    expect(isDisposableEmail('user@trashmail.net')).toBe(true);
  });

  it('handles mixed case and extra spaces in email strings', () => {
    expect(isDisposableEmail('  User@Mailinator.COM  ')).toBe(true);
    expect(isDisposableEmail('Spam@GUERRILLAMAIL.COM ')).toBe(true);
  });

  it('allows legitimate email providers and domains', () => {
    expect(isDisposableEmail('sarah@gmail.com')).toBe(false);
    expect(isDisposableEmail('alex@outlook.com')).toBe(false);
    expect(isDisposableEmail('developer@entrywise.dev')).toBe(false);
    expect(isDisposableEmail('ceo@webbound.in')).toBe(false);
  });

  it('handles invalid email values gracefully without throwing', () => {
    expect(isDisposableEmail('')).toBe(false);
    expect(isDisposableEmail('invalid-string')).toBe(false);
  });
});

describe('SpamGuard: Spam Keyword Blacklist', () => {
  const keywords = 'casino, viagra, crypto bonus, telegram: @';

  it('flags submissions containing prohibited spam words', () => {
    expect(containsSpamKeywords({ message: 'Click here for the best casino deals!' }, keywords).isSpam).toBe(true);
    expect(containsSpamKeywords({ subject: 'Get your crypto bonus now' }, keywords).isSpam).toBe(true);
    expect(containsSpamKeywords({ contact: 'Ping me on telegram: @hacker' }, keywords).isSpam).toBe(true);
  });

  it('is case-insensitive and identifies matched keyword', () => {
    const res = containsSpamKeywords({ notes: 'Buy VIAGRA cheap pills' }, keywords);
    expect(res.isSpam).toBe(true);
    expect(res.matchedKeyword).toBe('viagra');
  });

  it('allows clean submissions through', () => {
    expect(containsSpamKeywords({ message: 'Hi, I would love to schedule a demo of EntryWise' }, keywords).isSpam).toBe(false);
    expect(containsSpamKeywords({ name: 'John Doe', email: 'john@example.com' }, keywords).isSpam).toBe(false);
  });

  it('returns false when no keywords are configured', () => {
    expect(containsSpamKeywords({ message: 'crypto casino' }, null).isSpam).toBe(false);
    expect(containsSpamKeywords({ message: 'crypto casino' }, '').isSpam).toBe(false);
  });
});

describe('SpamGuard: IP Anonymization (GDPR Zero-IP Mode)', () => {
  it('masks the last octet of standard IPv4 addresses', () => {
    expect(anonymizeIpAddress('192.168.1.155')).toBe('192.168.1.0');
    expect(anonymizeIpAddress('10.0.0.42')).toBe('10.0.0.0');
    expect(anonymizeIpAddress('142.250.190.46')).toBe('142.250.190.0');
  });

  it('masks the trailing 80 bits of IPv6 addresses', () => {
    expect(anonymizeIpAddress('2001:0db8:85a3:0000:0000:8a2e:0370:7334')).toBe('2001:0db8:85a3::');
    expect(anonymizeIpAddress('2607:f8b0:4005:805::200e')).toBe('2607:f8b0:4005::');
  });

  it('handles missing or invalid IP strings gracefully', () => {
    expect(anonymizeIpAddress(undefined as any)).toBe('0.0.0.0');
    expect(anonymizeIpAddress('')).toBe('0.0.0.0');
    expect(anonymizeIpAddress('not-an-ip')).toBe('0.0.0.0');
  });
});

describe('CSV Sanitization: Formula Injection Defense (CWE-1236)', () => {
  it('prefixes formula trigger characters with a single quote', () => {
    expect(escapeCsvCell('=cmd|"/C calc"!A0')).toContain(`'=cmd`);
    expect(escapeCsvCell('+12345')).toBe(`'+12345`);
    expect(escapeCsvCell('-SUM(A1:A10)')).toBe(`'-SUM(A1:A10)`);
    expect(escapeCsvCell('@SUM(1+1)')).toBe(`'@SUM(1+1)`);
    expect(escapeCsvCell('\tTAB_INJECT')).toBe(`'\tTAB_INJECT`);
    expect(escapeCsvCell('\rRETURN_INJECT')).toContain(`'\rRETURN_INJECT`);
  });

  it('leaves standard benign strings and numbers untampered', () => {
    expect(escapeCsvCell('Hello World')).toBe('Hello World');
    expect(escapeCsvCell('john.doe@example.com')).toBe('john.doe@example.com');
    expect(escapeCsvCell(42)).toBe('42');
  });
});
