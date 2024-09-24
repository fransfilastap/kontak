"use client";

import React from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Phone } from "lucide-react";
import useSWR from "swr";
import fetcher from "@/lib/swr";
import { QRCodeResponse } from "@/lib/types";

interface QRContainerProps {
  client_id: string;
}
export default function QRContainer({ client_id }: Readonly<QRContainerProps>) {
  const { data, isLoading, error } = useSWR<QRCodeResponse>(
    `/api/kontak/qr/${client_id}`,
    fetcher
  );

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden max-w-md w-full">
        <div className="bg-green-500 p-4 text-white flex items-center">
          <Phone className="w-6 h-6 mr-2" />
          <h2 className="text-xl font-semibold">WhatsApp QR Code</h2>
        </div>
        <div className="p-6">
          <div className="bg-gray-100 p-4 rounded-lg mb-4 flex items-center justify-center">
            {isLoading ? (
              <p>Fetch QR...</p>
            ) : data?.is_connected ? (
              <p>Already connected</p>
            ) : (
              <QRCodeCanvas value={data?.code} />
            )}
          </div>
          <p className="text-center text-gray-600 mb-4">
            Scan this QR code to start a WhatsApp chat
          </p>
          <div className="text-sm text-gray-500">
            <p className="mb-2">1. Open WhatsApp on your phone</p>
            <p className="mb-2">
              2. Tap Menu or Settings and select WhatsApp Web
            </p>
            <p>3. Point your phone to this screen to capture the QR code</p>
          </div>
        </div>
      </div>
    </div>
  );
}
