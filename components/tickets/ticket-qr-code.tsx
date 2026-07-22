import Image from "next/image";
import QRCode from "qrcode";

type TicketQrCodeProps = {
  validationUrl: string;
};

export async function TicketQrCode({ validationUrl }: TicketQrCodeProps) {
  const qrDataUrl = await QRCode.toDataURL(validationUrl, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 280,
  });

  return (
    <div className="rounded-[2rem] border border-white/10 bg-white p-5 shadow-2xl shadow-black/30">
      <Image
        src={qrDataUrl}
        alt="Ticket QR code"
        width={280}
        height={280}
        unoptimized
        className="mx-auto h-[280px] w-[280px]"
      />
    </div>
  );
}