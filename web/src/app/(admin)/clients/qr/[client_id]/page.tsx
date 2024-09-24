import QRContainer from "@/app/(admin)/clients/qr/[client_id]/qr-container";

export const dynamic = "force-dynamic";

export default function Page({
  params: { client_id },
}: Readonly<{
  params: { client_id: string };
}>) {
  return (
    <div className="w-full max-w-md mx-auto">
      <QRContainer client_id={client_id} />
    </div>
  );
}
