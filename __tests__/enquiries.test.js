import { isUnconvertedEnquiry, partitionCustomerRecords } from '../utils/enquiries';

describe('enquiry lifecycle classification', () => {
  it('keeps inquiry and enquiry records out of the customer directory until converted', () => {
    const records = [
      { id: 1, purpose: 'Enquiry', status: 'Enquiry' },
      { id: 2, purpose: 'Inquiry / Quotation', status: 'Closed' },
      { id: 3, purpose: 'Repair / Service', status: 'In Progress' },
      { id: 4, purpose: 'Purchase', status: 'Converted' },
      { id: 5, purpose: 'Enquiry', status: 'converted', converted_repair_id: 81 },
      { id: 6, purpose: 'Enquiry', status: 'Converted' },
    ];

    expect(partitionCustomerRecords(records)).toEqual({
      enquiries: [records[0], records[1], records[5]],
      customers: [records[2], records[3], records[4]],
    });
  });

  it('recognizes enquiries by status even when purpose is absent', () => {
    expect(isUnconvertedEnquiry({ purpose: '', status: 'Inquiry' })).toBe(true);
    expect(isUnconvertedEnquiry({ purpose: 'Repair', status: 'In Progress' })).toBe(false);
  });
});
