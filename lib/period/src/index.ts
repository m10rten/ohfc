type Unit = "years" | "months" | "days" | "hours" | "minutes" | "seconds";

interface PeriodComponents {
  years: number;
  months: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  milliseconds: number;
}

export class Period {
  private readonly years: number;
  private readonly months: number;
  private readonly days: number;
  private readonly hours: number;
  private readonly minutes: number;
  private readonly seconds: number;
  private readonly milliseconds: number;

  private constructor(ctx: PeriodComponents) {
    this.years = ctx.years;
    this.months = ctx.months;
    this.days = ctx.days;
    this.hours = ctx.hours;
    this.minutes = ctx.minutes;
    this.seconds = ctx.seconds;
    this.milliseconds = ctx.milliseconds;
  }

  static parse(date: string): Period {
    // Split by whitespace, parse each piece, sum components
    const pieces = date.trim().toLowerCase().split(/\s+/);
    const comps: PeriodComponents = {
      years: 0,
      months: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      milliseconds: 0,
    };

    const regex = /^([+-]?\d+)(y|mo|w|d|h|m|s|ms)$/;

    for (const piece of pieces) {
      const match = regex.exec(piece);
      if (!match) {
        throw new Error(`Invalid period format part: "${piece}"`);
      }

      const value = Number(match[1]);
      const unit = match[2];

      switch (unit) {
        case "y":
          comps.years += value;
          break;
        case "mo":
          comps.months += value;
          break;
        case "w":
          comps.days += value * 7;
          break;
        case "d":
          comps.days += value;
          break;
        case "h":
          comps.hours += value;
          break;
        case "m":
          comps.minutes += value;
          break;
        case "s":
          comps.seconds += value;
          break;
        case "ms":
          comps.milliseconds += value;
          break;
        default:
          throw new Error(`Unsupported period unit: "${unit}"`);
      }
    }

    return new Period(comps);
  }

  // Add this period to a Date, returns new Date
  addTo(date: Date): Date {
    const result = new Date(date.getTime());
    result.setUTCFullYear(result.getUTCFullYear() + this.years);
    result.setUTCMonth(result.getUTCMonth() + this.months);

    const ms =
      this.days * 86400_000 + this.hours * 3600_000 + this.minutes * 60_000 + this.seconds * 1000 + this.milliseconds;

    result.setTime(result.getTime() + ms);
    return result;
  }

  // Convert the period to a string representation of resulting Date in ISO format,
  // optionally rounded down to the given smallest unit
  toString(baseDate: Date = new Date(), options?: { roundTo?: Unit }): string {
    let dt = this.addTo(baseDate);
    if (options?.roundTo) {
      dt = Period.roundDate(dt, options.roundTo);
    }
    return dt.toISOString();
  }

  // Get components readonly (optional helper)
  get components(): Readonly<PeriodComponents> {
    return {
      years: this.years,
      months: this.months,
      days: this.days,
      hours: this.hours,
      minutes: this.minutes,
      seconds: this.seconds,
      milliseconds: this.milliseconds,
    };
  }

  // ----------- Static helpers -----------

  // Round Date down to smallest unit specified
  private static roundDate(date: Date, roundTo: Unit): Date {
    const d = new Date(date.getTime());
    switch (roundTo) {
      case "years":
        d.setUTCMonth(0);
        d.setUTCDate(1);
        d.setUTCHours(0, 0, 0, 0);
        break;
      case "months":
        d.setUTCDate(1);
        d.setUTCHours(0, 0, 0, 0);
        break;
      case "days":
        d.setUTCHours(0, 0, 0, 0);
        break;
      case "hours":
        d.setUTCMinutes(0, 0, 0);
        break;
      case "minutes":
        d.setUTCSeconds(0, 0);
        break;
      case "seconds":
        d.setUTCMilliseconds(0);
        break;
    }
    return d;
  }
}
