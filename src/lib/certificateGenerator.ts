import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';

export interface CertificateData {
  certificateNumber: string;
  studentName: string;
  title: string;
  eventTitle: string;
  organizationName: string;
  issueDate: string;
}

export async function generateCertificatePdf(data: CertificateData): Promise<{
  dataUri: string;
  blob: Blob;
  qrCodeUrl: string;
}> {
  const verifyUrl = `${window.location.origin}/#verify/${data.certificateNumber}`;
  const qrCodeUrl = await QRCode.toDataURL(verifyUrl, {
    errorCorrectionLevel: 'H',
    width: 256,
    margin: 1,
    color: {
      dark: '#1e3a8a',
      light: '#ffffff',
    },
  });

  // Create A4 Landscape PDF
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 297;
  const pageHeight = 210;

  // Background tint
  doc.setFillColor(252, 253, 255);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Outer decorative border
  doc.setDrawColor(30, 58, 138); // Deep navy blue #1e3a8a
  doc.setLineWidth(2.5);
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20);

  // Inner thin border
  doc.setDrawColor(59, 130, 246); // Blue #3b82f6
  doc.setLineWidth(0.6);
  doc.rect(14, 14, pageWidth - 28, pageHeight - 28);

  // Corner accents
  doc.setFillColor(30, 58, 138);
  doc.rect(12, 12, 6, 6, 'F');
  doc.rect(pageWidth - 18, 12, 6, 6, 'F');
  doc.rect(12, pageHeight - 18, 6, 6, 'F');
  doc.rect(pageWidth - 18, pageHeight - 18, 6, 6, 'F');

  // Organization Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(51, 65, 85);
  doc.text(
    (data.organizationName || "O'ZBEKISTON RESPUBLIKASI OLIY TA'LIM, FAN VA INNOVATSIYALAR VAZIRLIGI").toUpperCase(),
    pageWidth / 2,
    28,
    { align: 'center' }
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('IQTIDORLI TALABALAR RESPUBLIKA MA\'LUMOTLAR PLATFORMASI', pageWidth / 2, 34, {
    align: 'center',
  });

  // Certificate Heading
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.setTextColor(30, 58, 138);
  doc.text((data.title || 'SERTIFIKAT').toUpperCase(), pageWidth / 2, 54, {
    align: 'center',
  });

  // Underline bar
  doc.setDrawColor(245, 158, 11); // amber gold
  doc.setLineWidth(1.2);
  doc.line(pageWidth / 2 - 40, 58, pageWidth / 2 + 40, 58);

  // Subtitle statement
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(11);
  doc.setTextColor(71, 85, 105);
  doc.text(
    'Ushbu sertifikat iqtidorli talaba sifatida erishgan yuksak natijalari hamda faoliyati uchun taqdim etiladi:',
    pageWidth / 2,
    72,
    { align: 'center' }
  );

  // Student Full Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(data.studentName, pageWidth / 2, 90, {
    align: 'center',
  });

  // Event Context
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(13);
  doc.setTextColor(51, 65, 85);
  doc.text(
    `«${data.eventTitle}» doirasida o'zining bilimi va ijodiy salohiyatini namoyon etgani uchun.`,
    pageWidth / 2,
    104,
    { align: 'center' }
  );

  // Certificate ID & Date Bar
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(pageWidth / 2 - 80, 118, 160, 14, 3, 3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 58, 138);
  doc.text(`Sertifikat ID: ${data.certificateNumber}`, pageWidth / 2 - 70, 126.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Berilgan sana: ${data.issueDate}`, pageWidth / 2 + 30, 126.5);

  // QR Code insertion
  const qrSize = 34;
  const qrX = 35;
  const qrY = 145;
  doc.addImage(qrCodeUrl, 'PNG', qrX, qrY, qrSize, qrSize);

  // QR details
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 58, 138);
  doc.text('HAQIQIYLIKNI TEKSHIRISH', qrX + qrSize + 6, qrY + 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Smartfon kamerasini ushbu QR-kodga qarating', qrX + qrSize + 6, qrY + 18);
  doc.text(`ID: ${data.certificateNumber}`, qrX + qrSize + 6, qrY + 23);

  // Signature / Seal section
  const sigX = pageWidth - 85;
  const sigY = 160;
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.5);
  doc.line(sigX, sigY, sigX + 60, sigY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 58, 138);
  doc.text('Komissiya Raisi / Mas\'ul kotib', sigX + 30, sigY + 5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Elektron raqamli tasdiqlangan', sigX + 30, sigY + 10, { align: 'center' });

  // Seal badge simulation
  doc.setDrawColor(22, 101, 52); // green
  doc.setLineWidth(0.8);
  doc.circle(sigX + 30, sigY - 14, 9);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.5);
  doc.setTextColor(22, 101, 52);
  doc.text('RASMIY', sigX + 30, sigY - 15, { align: 'center' });
  doc.text('TASDIQ', sigX + 30, sigY - 12, { align: 'center' });

  const dataUri = doc.output('datauristring');
  const blob = doc.output('blob');

  return {
    dataUri,
    blob,
    qrCodeUrl,
  };
}

export async function downloadCertificatePdf(data: CertificateData, filename?: string) {
  const { blob } = await generateCertificatePdf(data);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `${data.certificateNumber}_${data.studentName.replace(/\s+/g, '_')}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
