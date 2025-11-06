import type { CampusEvent } from '@/lib/types';

const CAMPUS_TIME_ZONE = 'America/Chicago';

const getDateFormatter = (timeZone: string) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

export const formatDateForInput = (date: Date, timeZone: string = CAMPUS_TIME_ZONE) =>
  getDateFormatter(timeZone).format(date);

export const getCurrentCampusDate = (reference: Date = new Date(), timeZone: string = CAMPUS_TIME_ZONE) =>
  getDateFormatter(timeZone).format(reference);

export const getEventDateRange = (event: CampusEvent, timeZone: string = CAMPUS_TIME_ZONE) => {
  const startDate = formatDateForInput(event.start, timeZone);
  const endDate = formatDateForInput(event.end, timeZone);

  return {
    startDate,
    endDate,
  };
};

export const eventOccursOnDate = (event: CampusEvent, date: string, timeZone: string = CAMPUS_TIME_ZONE) => {
  if (!date) {
    return true;
  }

  const { startDate, endDate } = getEventDateRange(event, timeZone);

  return date >= startDate && date <= endDate;
};

export const getCampusTimeZone = () => CAMPUS_TIME_ZONE;
