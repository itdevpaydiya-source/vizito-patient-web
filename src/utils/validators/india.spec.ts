import { describe, it, expect } from 'vitest';
import {
  validateMobile,
  validateLandline,
  validatePhone,
  validateEmergencyNumber,
  validateEmail,
  validatePinCode,
  validateAadhaar,
  maskAadhaar,
  validatePan,
  validateGstin,
  validateIfsc,
  validateBankAccount,
  maskBankAccount,
  validateUpiId,
  validateDoctorRegNo,
  validateNurseRegNo,
  validateDrugLicence,
  validateNablCert,
  validateHospitalReg,
  validatePersonName,
  validateDob,
  validateAmount,
  computeVerhoeff,
  computeGstinCheck,
} from './india';

describe('Indian Validators (VALIDATION_RULES.md single source of truth)', () => {
  describe('Mobile Validation', () => {
    it('accepts valid 10-digit Indian mobile numbers starting with 6, 7, 8, or 9', () => {
      expect(validateMobile('9876543210').ok).toBe(true);
      expect(validateMobile('8765432109').ok).toBe(true);
      expect(validateMobile('7654321098').ok).toBe(true);
      expect(validateMobile('6543210987').ok).toBe(true);
      expect(validateMobile('9876543210').value).toBe('9876543210');
    });

    it('normalises spaces, dashes, +91, 91 (12 digits), and leading 0', () => {
      expect(validateMobile('+91 98765-43210').ok).toBe(true);
      expect(validateMobile('+91 98765-43210').value).toBe('9876543210');
      expect(validateMobile('09876543210').ok).toBe(true);
      expect(validateMobile('09876543210').value).toBe('9876543210');
      expect(validateMobile('919876543210').ok).toBe(true);
      expect(validateMobile('919876543210').value).toBe('9876543210');
    });

    it('rejects numbers starting with 0-5', () => {
      expect(validateMobile('5555512345').ok).toBe(false);
      expect(validateMobile('1234567890').ok).toBe(false);
      expect(validateMobile('5555512345').message).toBe(
        'Enter a 10-digit mobile number starting with 6, 7, 8 or 9.'
      );
    });

    it('rejects all-same digits (e.g. 9999999999, 8888888888)', () => {
      expect(validateMobile('9999999999').ok).toBe(false);
      expect(validateMobile('8888888888').ok).toBe(false);
      expect(validateMobile('7777777777').ok).toBe(false);
    });

    it('handles empty optional mobile vs required', () => {
      expect(validateMobile('', { required: false }).ok).toBe(true);
      expect(validateMobile('', { required: true }).ok).toBe(false);
    });
  });

  describe('Landline Validation', () => {
    it('accepts valid landline with STD code (10-11 digits starting with 0)', () => {
      expect(validateLandline('040 2345 6789').ok).toBe(true);
      expect(validateLandline('040 2345 6789').value).toBe('04023456789');
      expect(validateLandline('011-23456789').ok).toBe(true);
      expect(validateLandline('011-23456789').value).toBe('01123456789');
      expect(validateLandline('08022223333').ok).toBe(true);
    });

    it('rejects landline without STD code or invalid format', () => {
      expect(validateLandline('23456789').ok).toBe(false);
      expect(validateLandline('040 2345 6789').ok).toBe(true);
      expect(validateLandline('09999999999').ok).toBe(false);
      expect(validateLandline('040').ok).toBe(false);
    });
  });

  describe('Phone (Mobile or Landline)', () => {
    it('accepts both valid mobile and valid landline', () => {
      expect(validatePhone('9876543210').ok).toBe(true);
      expect(validatePhone('040 2345 6789').ok).toBe(true);
    });

    it('rejects invalid mobile and landline', () => {
      const res = validatePhone('12345');
      expect(res.ok).toBe(false);
      expect(res.message).toBe('Enter a 10-digit mobile or a landline with STD code.');
    });
  });

  describe('Emergency Number', () => {
    it('accepts short emergency codes (112, 108, 102, 100, 101)', () => {
      expect(validateEmergencyNumber('112').ok).toBe(true);
      expect(validateEmergencyNumber('108').ok).toBe(true);
      expect(validateEmergencyNumber('102').ok).toBe(true);
      expect(validateEmergencyNumber('100').ok).toBe(true);
      expect(validateEmergencyNumber('101').ok).toBe(true);
    });

    it('accepts full mobile or landline numbers as emergency contact', () => {
      expect(validateEmergencyNumber('9876543210').ok).toBe(true);
      expect(validateEmergencyNumber('04023456789').ok).toBe(true);
    });

    it('rejects invalid numbers', () => {
      expect(validateEmergencyNumber('999').ok).toBe(false);
      expect(validateEmergencyNumber('999').message).toBe(
        'Enter 108 / 112 or a valid phone number.'
      );
    });
  });

  describe('Email Validation', () => {
    it('accepts valid email and normalises to lowercase trim', () => {
      const res = validateEmail('  Dr.Sharma@Example.COM  ');
      expect(res.ok).toBe(true);
      expect(res.value).toBe('dr.sharma@example.com');
    });

    it('rejects invalid email formats', () => {
      expect(validateEmail('invalid-email').ok).toBe(false);
      expect(validateEmail('test@').ok).toBe(false);
      expect(validateEmail('test@domain').ok).toBe(false);
      expect(validateEmail('test@domain.c').ok).toBe(false);
      expect(validateEmail('test@domain.com').ok).toBe(true);
    });
  });

  describe('PIN Code Validation', () => {
    it('accepts 6-digit PIN codes starting with 1-9', () => {
      expect(validatePinCode('500081').ok).toBe(true);
      expect(validatePinCode('110001').ok).toBe(true);
      expect(validatePinCode('  500081  ').value).toBe('500081');
    });

    it('rejects PIN codes starting with 0 or with wrong length', () => {
      expect(validatePinCode('050081').ok).toBe(false);
      expect(validatePinCode('50008').ok).toBe(false);
      expect(validatePinCode('5000811').ok).toBe(false);
      expect(validatePinCode('500081').message).toBe('');
      expect(validatePinCode('050081').message).toBe('Enter a 6-digit PIN code.');
    });
  });

  describe('Aadhaar and Verhoeff Checksum', () => {
    it('correctly computes and validates Verhoeff checksum', () => {
      const check = computeVerhoeff('23456789012');
      expect(check).toBe(4);
      expect(validateAadhaar('234567890124').ok).toBe(true);
    });

    it('accepts valid 12-digit Aadhaar numbers', () => {
      expect(validateAadhaar('234567890124').ok).toBe(true);
      expect(validateAadhaar('367890123454').ok).toBe(true);
      expect(validateAadhaar('987654321096').ok).toBe(true);
      expect(validateAadhaar('456789012341').ok).toBe(true);
    });

    it('normalises spaces in Aadhaar', () => {
      expect(validateAadhaar('2345 6789 0124').ok).toBe(true);
      expect(validateAadhaar('2345 6789 0124').value).toBe('234567890124');
    });

    it('rejects Aadhaar starting with 0 or 1', () => {
      expect(validateAadhaar('012345678901').ok).toBe(false);
      expect(validateAadhaar('123456789012').ok).toBe(false);
    });

    it('rejects Aadhaar with invalid Verhoeff check digit', () => {
      expect(validateAadhaar('234567890125').ok).toBe(false);
      expect(validateAadhaar('234567890125').message).toBe(
        'Enter a valid 12-digit Aadhaar number.'
      );
    });

    it('masks Aadhaar correctly', () => {
      expect(maskAadhaar('234567890124')).toBe('XXXX XXXX 0124');
      expect(maskAadhaar('2345 6789 0124')).toBe('XXXX XXXX 0124');
    });
  });

  describe('PAN Validation', () => {
    it('accepts valid PAN and normalises to uppercase', () => {
      expect(validatePan('abcpe1234f').ok).toBe(true);
      expect(validatePan('abcpe1234f').value).toBe('ABCPE1234F');
      expect(validatePan('AAPFU0939F').ok).toBe(true);
      expect(validatePan('AAACH7409R').ok).toBe(true);
    });

    it('validates 4th character holder type (A, B, C, F, G, H, L, J, P, T)', () => {
      expect(validatePan('ABCPE1234F').ok).toBe(true); // P = Person
      expect(validatePan('ABCFE1234F').ok).toBe(true); // F = Firm
      expect(validatePan('ABCZE1234F').ok).toBe(false); // Z = Invalid holder
      expect(validatePan('ABCXE1234F').ok).toBe(false);
    });

    it('rejects malformed PAN', () => {
      expect(validatePan('ABCPE123F').ok).toBe(false); // only 3 digits
      expect(validatePan('ABCPE12345F').ok).toBe(false); // 5 digits
      expect(validatePan('ABCPE12345').ok).toBe(false);
    });
  });

  describe('GSTIN Validation and Mod-36 Checksum', () => {
    it('computes Mod-36 checksum accurately', () => {
      expect(computeGstinCheck('27AAPFU0939F1Z')).toBe('V');
      expect(computeGstinCheck('36AAACH7409R1Z')).toBe('2');
      expect(computeGstinCheck('29ABCPD1234F1Z')).toBe('8');
      expect(computeGstinCheck('07AAAAA0000A1Z')).toBe('4');
    });

    it('accepts valid 15-character GSTIN with valid state code, PAN and checksum', () => {
      expect(validateGstin('27AAPFU0939F1ZV').ok).toBe(true);
      expect(validateGstin('27AAPFU0939F1ZV').value).toBe('27AAPFU0939F1ZV');
      expect(validateGstin('36AAACH7409R1Z2').ok).toBe(true);
      expect(validateGstin('29ABCPD1234F1Z8').ok).toBe(true);
      expect(validateGstin('07AAAAA0000A1Z4').ok).toBe(true);
    });

    it('normalises lowercase GSTIN to uppercase', () => {
      expect(validateGstin('27aapfu0939f1zv').ok).toBe(true);
      expect(validateGstin('27aapfu0939f1zv').value).toBe('27AAPFU0939F1ZV');
    });

    it('rejects invalid state codes (00 or >38)', () => {
      expect(validateGstin('00AAPFU0939F1ZV').ok).toBe(false);
      expect(validateGstin('39AAPFU0939F1ZV').ok).toBe(false);
    });

    it('rejects GSTIN with invalid PAN in characters 3-12', () => {
      expect(validateGstin('27ABCZE1234F1ZV').ok).toBe(false); // PAN 4th char Z invalid
    });

    it('rejects GSTIN with incorrect Mod-36 checksum', () => {
      expect(validateGstin('27AAPFU0939F1ZX').ok).toBe(false);
      expect(validateGstin('27AAPFU0939F1ZX').message).toBe(
        'Enter a valid 15-character GSTIN.'
      );
    });
  });

  describe('IFSC Validation', () => {
    it('accepts valid IFSC and normalises to uppercase', () => {
      expect(validateIfsc('sbin0001234').ok).toBe(true);
      expect(validateIfsc('sbin0001234').value).toBe('SBIN0001234');
      expect(validateIfsc('HDFC0000001').ok).toBe(true);
    });

    it('rejects invalid IFSC (5th char must be 0)', () => {
      expect(validateIfsc('SBIN1001234').ok).toBe(false);
      expect(validateIfsc('SBI0001234').ok).toBe(false);
      expect(validateIfsc('SBIN00012345').ok).toBe(false);
      expect(validateIfsc('SBIN1001234').message).toBe(
        'Enter a valid IFSC, e.g. SBIN0001234.'
      );
    });
  });

  describe('Bank Account Number and Masking', () => {
    it('accepts 9 to 18 digits', () => {
      expect(validateBankAccount('123456789').ok).toBe(true);
      expect(validateBankAccount('123456789012345678').ok).toBe(true);
      expect(validateBankAccount('1234 5678 9012').ok).toBe(true);
      expect(validateBankAccount('1234 5678 9012').value).toBe('123456789012');
    });

    it('rejects account numbers with <9 or >18 digits', () => {
      expect(validateBankAccount('12345678').ok).toBe(false);
      expect(validateBankAccount('1234567890123456789').ok).toBe(false);
    });

    it('verifies confirmation match if confirmValue is provided', () => {
      expect(
        validateBankAccount('1234567890', { confirmValue: '1234567890' }).ok
      ).toBe(true);
      expect(
        validateBankAccount('1234567890', { confirmValue: '1234567899' }).ok
      ).toBe(false);
      expect(
        validateBankAccount('1234567890', { confirmValue: '1234567899' }).message
      ).toBe('Account numbers do not match.');
    });

    it('masks bank account numbers properly', () => {
      expect(maskBankAccount('123456789012')).toBe('XXXXXXXX9012');
      expect(maskBankAccount('123456789')).toBe('XXXXXX6789');
    });
  });

  describe('UPI ID Validation', () => {
    it('accepts valid UPI ID and normalises to lowercase', () => {
      expect(validateUpiId('name@okaxis').ok).toBe(true);
      expect(validateUpiId('USER.NAME-123@OKHDFCBANK').ok).toBe(true);
      expect(validateUpiId('USER.NAME-123@OKHDFCBANK').value).toBe(
        'user.name-123@okhdfcbank'
      );
    });

    it('rejects invalid UPI IDs', () => {
      expect(validateUpiId('bad').ok).toBe(false);
      expect(validateUpiId('@okaxis').ok).toBe(false);
      expect(validateUpiId('name@').ok).toBe(false);
      expect(validateUpiId('name@123').ok).toBe(false);
    });
  });

  describe('Doctor and Nurse Registration Numbers', () => {
    it('accepts valid registration numbers (4-20 chars, at least 3 digits)', () => {
      expect(validateDoctorRegNo('MCI-12345').ok).toBe(true);
      expect(validateDoctorRegNo('TSMC/2021/9876').ok).toBe(true);
      expect(validateDoctorRegNo('tsmc/2021/9876').value).toBe('TSMC/2021/9876');
      expect(validateNurseRegNo('INC-2023-8877').ok).toBe(true);
    });

    it('rejects registration numbers with fewer than 3 digits or invalid chars', () => {
      expect(validateDoctorRegNo('AB12').ok).toBe(false);
      expect(validateDoctorRegNo('AB12').message).toBe(
        'Enter the registration number from your council certificate.'
      );
      expect(validateDoctorRegNo('MCI@12345').ok).toBe(false);
    });

    it('validates council when council option is passed', () => {
      expect(
        validateDoctorRegNo('MCI-12345', { council: 'Telangana Medical Council' }).ok
      ).toBe(true);
      expect(validateDoctorRegNo('MCI-12345', { council: '' }).ok).toBe(false);
    });
  });

  describe('Drug Licence Validation', () => {
    it('accepts valid drug licences (5-30 chars [A-Z0-9/-])', () => {
      expect(validateDrugLicence('TS/HYD/2023/12345').ok).toBe(true);
      expect(validateDrugLicence('20B-12345').ok).toBe(true);
      expect(validateDrugLicence('20b-12345').value).toBe('20B-12345');
    });

    it('rejects invalid drug licences', () => {
      expect(validateDrugLicence('DL-1').ok).toBe(false);
      expect(validateDrugLicence('TS/HYD/2023/12345$').ok).toBe(false);
    });
  });

  describe('NABL Certificate Validation', () => {
    it('accepts valid NABL certificates and allows empty when optional', () => {
      expect(validateNablCert('').ok).toBe(true);
      expect(validateNablCert('MC-2345').ok).toBe(true);
      expect(validateNablCert('mc-2345').value).toBe('MC-2345');
      expect(validateNablCert('CC1234').ok).toBe(true);
      expect(validateNablCert('M-123').ok).toBe(true);
    });

    it('rejects invalid format when filled', () => {
      expect(validateNablCert('INVALID123456').ok).toBe(false);
      expect(validateNablCert('INVALID123456').message).toBe(
        'Enter the NABL certificate number, e.g. MC-2345.'
      );
    });
  });

  describe('Hospital / Clinic Registration (CEA)', () => {
    it('accepts 4-40 characters', () => {
      expect(validateHospitalReg('CEA-2023-9988').ok).toBe(true);
      expect(validateHospitalReg('HOSP/TS/12345/REG').ok).toBe(true);
    });

    it('rejects <4 or >40 characters', () => {
      expect(validateHospitalReg('12').ok).toBe(false);
    });
  });

  describe('Person Name Validation', () => {
    it('accepts names in Latin and Indian scripts, collapsing spaces', () => {
      expect(validatePersonName('  Dr.  Rajesh   Kumar  ').ok).toBe(true);
      expect(validatePersonName('  Dr.  Rajesh   Kumar  ').value).toBe('Dr. Rajesh Kumar');
      expect(validatePersonName("Mary-Jane O'Connor").ok).toBe(true);
      expect(validatePersonName('P. V. Sindhu').ok).toBe(true);
      expect(validatePersonName('రాజేష్ குமார் राजेश').ok).toBe(true);
    });

    it('rejects numbers, pure symbols or names outside 2-80 characters', () => {
      expect(validatePersonName('A').ok).toBe(false);
      expect(validatePersonName('John123').ok).toBe(false);
      expect(validatePersonName('!!!').ok).toBe(false);
      expect(validatePersonName('John123').message).toBe('Enter the name as on the ID.');
    });
  });

  describe('Date of Birth Validation', () => {
    it('accepts valid past dates within 0-120 age range', () => {
      expect(validateDob('1990-05-15').ok).toBe(true);
      expect(validateDob('2015-01-01').ok).toBe(true);
    });

    it('rejects future dates', () => {
      expect(validateDob('2099-01-01').ok).toBe(false);
      expect(validateDob('2099-01-01').message).toBe('Enter a valid date of birth.');
    });

    it('enforces minAge when specified (e.g. 18 for doctors and staff)', () => {
      expect(validateDob('2018-01-01', { minAge: 18 }).ok).toBe(false);
      expect(validateDob('1995-01-01', { minAge: 18 }).ok).toBe(true);
    });
  });

  describe('Amount Validation', () => {
    it('accepts valid amounts with up to 2 decimal places', () => {
      expect(validateAmount('1500').ok).toBe(true);
      expect(validateAmount('1500.50').ok).toBe(true);
      expect(validateAmount('1,500.50').value).toBe(1500.5);
      expect(validateAmount(0).ok).toBe(true);
    });

    it('rejects negative amounts or >2 decimal places', () => {
      expect(validateAmount('-50').ok).toBe(false);
      expect(validateAmount('150.999').ok).toBe(false);
      expect(validateAmount('-50').message).toBe('Enter a valid amount.');
    });
  });
});
