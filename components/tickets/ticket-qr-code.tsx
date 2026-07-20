import Image from "next/image";
import QRCode from "qrcode";

type TicketQrCodeProps = {
  validationUrl: string;
};

export async function TicketQrCode({ validationUrl }: TicketQrCodeProps) {
  const qrDataUrl = await QRCode.toDataURL(validationUrl, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 260,
  });

  return (
    <div className="rounded-lg border bg-white p-4">
      <Image
        src={qrDataUrl}
        alt="Ticket QR code"
        width={260}
        height={260}
        unoptimized
        className="mx-auto h-64 w-64"
      />
    </div>
  );
}