import QRContainer from "@/app/(admin)/clients/qr/[client_id]/qr-container";

export const dynamic = "force-dynamic";

export default async function Page(
  props: Readonly<{
    params: { client_id: string };
  }>
) {
  const params = await props.params;

  const {
    client_id
  } = params;

  return (
    <div className="w-full max-w-md mx-auto">
      <QRContainer client_id={client_id} />
    </div>
  );
}
