import type { TransactionRepositoryPort } from '@/server/shared/ports/transactions';

export function currentMonth(now: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(now);
  const year = parts.find(part => part.type === 'year')!.value;
  const month = parts.find(part => part.type === 'month')!.value;
  return `${year}-${month}`;
}

export function monthBoundaries(month: string) {
  const [year, monthNumber] = month.split('-').map(Number);
  return {
    start: new Date(Date.UTC(year, monthNumber - 1, 1)),
    end: new Date(Date.UTC(year, monthNumber, 1)),
  };
}

export class GetTransactionsByMonthService {
  constructor(
    private repo: TransactionRepositoryPort,
    private now: () => Date,
    private timezone: () => string,
  ) {}

  async execute(userId: string, requestedMonth?: string) {
    const month = requestedMonth ?? currentMonth(this.now(), this.timezone());
    const { start, end } = monthBoundaries(month);
    return this.repo.findByDateRange(userId, start, end);
  }
}
