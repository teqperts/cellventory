function isInquiry(record) {
  const purpose = (record.purpose || '').toLowerCase();
  const status = (record.status || '').toLowerCase();
  return purpose.includes('inquiry') || purpose.includes('enquiry') || status === 'inquiry' || status === 'enquiry';
}

function isRepairPurpose(record) {
  const purpose = (record.purpose || '').toLowerCase();
  return !purpose || purpose.includes('repair') || purpose.includes('service');
}

function withJobSummary(record, customer, isLegacyFallback, today) {
  const estimatedCost = parseFloat(record.estimated_cost) || 0;
  const advancePaid = parseFloat(record.advance_paid) || 0;
  const status = record.status || 'In Progress';

  return {
    ...record,
    customer,
    customer_id: record.customer_id ?? customer.id,
    issue: record.issue || record.notes || '',
    status,
    estimated_cost: estimatedCost,
    advance_paid: advancePaid,
    balanceDue: Math.max(0, estimatedCost - advancePaid),
    isReady: status === 'Ready for Delivery',
    isDelivered: status === 'Delivered',
    isOverdue:
      Boolean(record.delivery_date) &&
      record.delivery_date < today &&
      status !== 'Delivered',
    isLegacyFallback,
    jobKey: `${isLegacyFallback ? 'legacy' : 'repair'}-${record.id}`,
  };
}

function compareNewestFirst(a, b) {
  const aTime = Date.parse(a.created_at || '') || 0;
  const bTime = Date.parse(b.created_at || '') || 0;
  return bTime - aTime || Number(b.id) - Number(a.id);
}

export function buildRepairJobs(customers = [], repairs = [], today = new Date().toISOString().slice(0, 10)) {
  const customersById = new Map(customers.map((customer) => [String(customer.id), customer]));
  const repairCustomerIds = new Set(
    repairs
      .filter(
        (repair) =>
          repair.customer_id != null &&
          !isInquiry(repair) &&
          isRepairPurpose(repair)
      )
      .map((repair) => String(repair.customer_id))
  );

  const jobs = repairs
    .filter((repair) => !isInquiry(repair) && isRepairPurpose(repair))
    .map((repair) => {
      const customer =
        customersById.get(String(repair.customer_id)) || {
          id: repair.customer_id,
          name: repair.customer_name || '',
          phone: repair.customer_phone || '',
        };
      return withJobSummary(repair, customer, false, today);
    });

  customers.forEach((customer) => {
    if (repairCustomerIds.has(String(customer.id)) || isInquiry(customer) || !isRepairPurpose(customer)) {
      return;
    }

    if (!customer.device_model && !customer.imei && !customer.notes) {
      return;
    }

    jobs.push(
      withJobSummary(
        {
          ...customer,
          customer_id: customer.id,
          device_model: customer.device_model || 'Device',
          issue: customer.notes || '',
          imei: customer.imei || '',
        },
        customer,
        true,
        today
      )
    );
  });

  return jobs.sort(compareNewestFirst);
}

export function filterRepairJobs(
  jobs,
  { search = '', statusFilter = 'all', showAll = false } = {}
) {
  const query = search.trim().toLowerCase();
  const filtered = jobs.filter((job) => {
    if (statusFilter === 'in_progress' && job.status !== 'In Progress') return false;
    if (statusFilter === 'ready' && !job.isReady) return false;
    if (statusFilter === 'overdue' && !job.isOverdue) return false;
    if (statusFilter === 'due' && job.balanceDue <= 0) return false;

    if (!query) return true;
    const searchable = [
      job.device_model,
      job.issue,
      job.imei,
      job.id,
      job.purpose,
    ];
    return searchable.some((value) => String(value || '').toLowerCase().includes(query));
  });

  return showAll ? filtered : filtered.slice(0, 10);
}
