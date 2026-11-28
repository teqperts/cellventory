function isEnquiryPurpose(purpose = '') {
  const normalized = String(purpose).toLowerCase();
  return normalized.includes('inquiry') || normalized.includes('enquiry');
}

export function isUnconvertedEnquiry(record) {
  if (!record) return false;

  const status = String(record.status || '').toLowerCase();
  const isEnquiry = isEnquiryPurpose(record.purpose) || status === 'inquiry' || status === 'enquiry';
  const hasRepairConversion = Number(record.converted_repair_id) > 0;

  return isEnquiry && !hasRepairConversion;
}

export function partitionCustomerRecords(records = []) {
  return records.reduce(
    (result, record) => {
      result[isUnconvertedEnquiry(record) ? 'enquiries' : 'customers'].push(record);
      return result;
    },
    { customers: [], enquiries: [] }
  );
}
