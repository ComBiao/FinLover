import mongoose, { Schema, Document } from 'mongoose';
import mongooseLeanGetters from 'mongoose-lean-getters';
import { assertTransactionWrite } from '../transaction-write-guard';
import { MAX_INTERVAL, SCHEDULER_FREQUENCIES, SCHEDULER_STATUSES, type SchedulerFrequency, type SchedulerStatus } from '@/shared/contracts/schedulers';

export interface IScheduler extends Document {
  userId: mongoose.Types.ObjectId;
  walletId: mongoose.Types.ObjectId;
  categoryId: mongoose.Types.ObjectId;
  type: 'income' | 'expense';
  amount: number;
  title: string;
  notes?: string;
  note?: string;
  startDate: Date;
  /** Day of month the schedule is anchored on; monthly/yearly dates clamp to it. */
  anchorDay: number;
  frequency: SchedulerFrequency;
  interval: number;
  endType: 'never' | 'count' | 'endDate';
  endCount?: number;
  endDate?: Date;
  status: SchedulerStatus;
  createdCount: number;
  /** Null once completed or cancelled. */
  nextDueDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const SchedulerSchema = new Schema<IScheduler>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  walletId: { type: Schema.Types.ObjectId, ref: 'Wallet', required: true },
  categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
  type: { type: String, enum: ['income', 'expense'], required: true },
  amount: { type: Number, required: true, min: [0.01, 'Amount must be at least 0.01'] },
  title: { type: String, required: true, trim: true, maxlength: 100 },
  notes: { type: String, maxlength: 255, alias: 'note' },
  startDate: { type: Date, required: true },
  anchorDay: { type: Number, required: true, min: 1, max: 31 },
  frequency: { type: String, enum: SCHEDULER_FREQUENCIES, required: true },
  interval: {
    type: Number,
    required: true,
    min: 1,
    validate: {
      validator(this: unknown, value: number) { return value <= MAX_INTERVAL[(this as IScheduler).frequency]; },
      message: 'interval exceeds the maximum for this frequency',
    },
  },
  endType: { type: String, enum: ['never', 'count', 'endDate'], default: 'never', required: true },
  endCount: { type: Number, min: 1 },
  endDate: { type: Date },
  status: { type: String, enum: SCHEDULER_STATUSES, default: 'active', required: true },
  createdCount: { type: Number, default: 0, min: 0 },
  nextDueDate: {
    type: Date,
    default: null,
    required: [
      function (this: IScheduler) { return this.status === 'active' || this.status === 'paused'; },
      'nextDueDate is required while a scheduler is active or paused',
    ],
  },
}, {
  timestamps: true,
  toJSON: { getters: true },
  toObject: { getters: true },
});

SchedulerSchema.index({ userId: 1, status: 1 });
// The cron job scans due active schedulers.
SchedulerSchema.index({ status: 1, nextDueDate: 1 });
SchedulerSchema.index({ walletId: 1 });
SchedulerSchema.index({ categoryId: 1 });

// Same capability guard as Transaction: writes go through SchedulerRepository inside a UnitOfWork.
SchedulerSchema.pre('save', function () { assertTransactionWrite(this, this.$session()); });
SchedulerSchema.pre(['updateOne', 'updateMany', 'findOneAndUpdate', 'replaceOne', 'findOneAndReplace', 'deleteOne', 'deleteMany', 'findOneAndDelete'], function () {
  assertTransactionWrite(this, this.getOptions().session);
});
SchedulerSchema.pre('deleteOne', { document: true, query: false }, function () {
  assertTransactionWrite(this, this.$session());
});
SchedulerSchema.pre('insertMany', function () { assertTransactionWrite(this); });
SchedulerSchema.pre('bulkWrite', function () { assertTransactionWrite(this); });
SchedulerSchema.plugin(mongooseLeanGetters);

export default (mongoose.models.Scheduler as mongoose.Model<IScheduler>) || mongoose.model<IScheduler>('Scheduler', SchedulerSchema);
