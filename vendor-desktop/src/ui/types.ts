export type Job = {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  status: string;
  createdAt: string;
  message: string;
  previewUrl?: string;
};

export type State = {
  host: string;
  port: number;
  guestUrl: string;
  sessionToken: string;
  autoApprove: boolean;
  printers: string[];
  selectedPrinter: string;
  jobs: Job[];
};
