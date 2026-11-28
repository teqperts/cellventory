import { buildRepairJobs, filterRepairJobs } from '../utils/repairJobs';

describe('job-centric repair list data', () => {
  const today = '2026-11-28';

  it('creates a separate job row for each repair and calculates each balance independently', () => {
    const jobs = buildRepairJobs(
      [{ id: 5, name: 'Asha Patel', phone: '9876543210' }],
      [
        {
          id: 12,
          customer_id: 5,
          purpose: 'Repair / Service',
          device_model: 'Pixel 8',
          status: 'Ready for Delivery',
          delivery_date: '2026-11-20',
          estimated_cost: 1500,
          advance_paid: 500,
          created_at: '2026-11-20T12:00:00.000Z',
        },
        {
          id: 11,
          customer_id: 5,
          purpose: 'Repair / Service',
          device_model: 'iPhone 13',
          status: 'In Progress',
          estimated_cost: 900,
          advance_paid: 900,
          created_at: '2026-11-19T12:00:00.000Z',
        },
      ],
      today
    );

    expect(jobs.map((job) => job.id)).toEqual([12, 11]);
    expect(jobs.map((job) => job.balanceDue)).toEqual([1000, 0]);
    expect(jobs[0]).toMatchObject({ isReady: true, isOverdue: true });
    expect(jobs[0].customer.name).toBe('Asha Patel');
  });

  it('excludes enquiry and purchase records from Jobs', () => {
    const jobs = buildRepairJobs(
      [],
      [
        { id: 3, customer_id: 3, purpose: 'Enquiry', status: 'Enquiry' },
        { id: 2, customer_id: 2, purpose: 'Purchase', device_model: 'Used Phone' },
        { id: 1, customer_id: 1, purpose: 'Repair / Service', device_model: 'Galaxy S22' },
      ],
      today
    );

    expect(jobs.map((job) => job.id)).toEqual([1]);
  });

  it('includes legacy repair records without duplicating customers that have repair rows', () => {
    const jobs = buildRepairJobs(
      [
        {
          id: 5,
          name: 'Legacy Repair',
          purpose: 'Repair / Service',
          device_model: 'iPhone 11',
          notes: 'Battery replacement',
          status: 'Delivered',
          estimated_cost: 800,
          advance_paid: 300,
          created_at: '2026-11-18T12:00:00.000Z',
        },
        {
          id: 6,
          name: 'Existing Repair',
          purpose: 'Repair / Service',
          device_model: 'Pixel 7',
        },
        {
          id: 7,
          name: 'Purchase Contact',
          purpose: 'Purchase',
          device_model: 'Used Phone',
        },
        {
          id: 8,
          name: 'Repair with Purchase Record',
          purpose: 'Repair / Service',
          device_model: 'iPhone 12',
          notes: 'Charging port',
        },
      ],
      [
        { id: 21, customer_id: 6, purpose: 'Repair / Service', device_model: 'Pixel 7' },
        { id: 22, customer_id: 8, purpose: 'Purchase', device_model: 'Used Phone' },
      ],
      today
    );

    expect(jobs).toHaveLength(3);
    expect(jobs.find((job) => job.isLegacyFallback)).toMatchObject({
      id: 5,
      jobKey: 'legacy-5',
      issue: 'Battery replacement',
      balanceDue: 500,
      isDelivered: true,
    });
    expect(jobs.some((job) => job.customer_id === 6 && job.isLegacyFallback)).toBe(false);
    expect(jobs.some((job) => job.customer_id === 7)).toBe(false);
    expect(jobs.some((job) => job.customer_id === 8 && job.isLegacyFallback)).toBe(true);
  });

  it('shows only ten matching jobs by default and can reveal all older jobs', () => {
    const jobs = Array.from({ length: 12 }, (_, index) => ({
      id: 12 - index,
      jobKey: `repair-${12 - index}`,
      status: 'In Progress',
      balanceDue: 0,
    }));

    expect(filterRepairJobs(jobs)).toHaveLength(10);
    expect(filterRepairJobs(jobs, { showAll: true })).toHaveLength(12);
  });

  it('searches job details without matching customer identity', () => {
    const jobs = buildRepairJobs(
      [{ id: 5, name: 'Asha Patel', phone: '9876543210' }],
      [
        {
          id: 12,
          customer_id: 5,
          purpose: 'Repair / Service',
          device_model: 'Pixel 8',
          issue: 'Screen replacement',
        },
      ],
      today
    );

    expect(filterRepairJobs(jobs, { search: 'Pixel 8', showAll: true })).toHaveLength(1);
    expect(filterRepairJobs(jobs, { search: 'Asha Patel', showAll: true })).toHaveLength(0);
    expect(filterRepairJobs(jobs, { search: '9876543210', showAll: true })).toHaveLength(0);
  });
});
