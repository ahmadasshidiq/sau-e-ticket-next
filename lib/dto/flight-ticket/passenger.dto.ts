export interface PassengerDto {
  id?: string;
  title?: string | null;
  name: string;
  passengerType?: string | null;
  baggage?: string | null;
  ticketNumber?: string | null;
}
