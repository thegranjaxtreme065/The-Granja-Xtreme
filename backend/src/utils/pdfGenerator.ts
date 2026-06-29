import PDFDocument from 'pdfkit';
import { Invoice } from '../models/invoice.model';
import { Payment } from '../models/payment.model';

const formatTZDate = (d: any) => {
  if (!d) return 'N/A';
  return new Date(d).toLocaleDateString('en-US', { timeZone: 'America/Santo_Domingo', year: 'numeric', month: 'short', day: 'numeric' });
};

const formatTZDateTime = (d: any) => {
  if (!d) return 'N/A';
  return new Date(d).toLocaleString('en-US', { timeZone: 'America/Santo_Domingo', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const formatAtvName = (atv: any) => {
  if (!atv) return 'N/A';
  const unit = atv.unitNumber ? `[${atv.unitNumber}] - ` : '';
  const color = atv.color ? ` - [${atv.color}]` : '';
  return `${unit}${atv.name || ''} ${atv.model || ''}${color}`.trim();
};

export const generateWaiverPDF = async (booking: any, waiver: any, language: 'EN' | 'ES' = 'EN'): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];
    
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', (err) => reject(err));
    
    // Title
    doc.fillColor('#396759') // Forest Green
       .font('Helvetica-Bold')
       .fontSize(22)
       .text('THE GRANJA XTREME', { align: 'center' });
    doc.moveDown(0.2);
    
    const titleText = language === 'ES' 
      ? 'CONTRATO DE ALQUILER Y EXENCIÓN DE RESPONSABILIDAD' 
      : 'ATV RENTAL LIABILITY WAIVER & AGREEMENT';
      
    doc.fillColor('#4d6700') // Moss Green
       .fontSize(14)
       .text(titleText, { align: 'center' });
    
    doc.moveDown(1.5);
    
    // Booking Details
    doc.fillColor('#111827')
       .font('Helvetica-Bold')
       .fontSize(12)
       .text(language === 'ES' ? 'DETALLES DE RESERVA' : 'RESERVATION DETAILS');
    doc.font('Helvetica')
       .fontSize(10);
    doc.moveDown(0.4);
    
    const clientName = booking.customerId ? `${booking.customerId.firstName} ${booking.customerId.lastName}` : waiver.customerName;
    doc.text(`Contract No: ${waiver.contractNumber}`);
    doc.text(`Booking No: ${booking.bookingNumber}`);
    doc.text(`Customer Name: ${clientName}`);
    doc.text(`ATV Model: ${formatAtvName(booking.atvId)}`);
    doc.text(`Rental Start: ${formatTZDate(booking.startDate)}`);
    doc.text(`Rental End: ${formatTZDate(booking.endDate)}`);
    
    doc.moveDown(1.5);
    
    // Waiver Terms
    doc.font('Helvetica-Bold')
       .fontSize(12)
       .text(language === 'ES' ? 'TÉRMINOS, CONDICIONES Y EXENCIÓN' : 'TERMS & CONDITIONS RELEASE OF LIABILITY');
    doc.font('Helvetica')
       .fontSize(9)
       .fillColor('#374151');
    doc.moveDown(0.4);
    
    const termsTextEN = 
      "I hereby acknowledge that operating an All-Terrain Vehicle (ATV) / Four Wheeler is a high-risk activity. I agree to wear a helmet at all times, follow all safety instructions, and assume full financial responsibility for any damages caused to the vehicle. I release The Granja Xtreme from any liability for personal injuries sustained during the rental duration.\n\n" +
      "1. Helmets are mandatory for all operators and passengers. Safety gear is provided and must be worn properly.\n" +
      "2. Operation is prohibited under the influence of drugs, alcohol, or medications causing impairment.\n" +
      "3. All riders must strictly stay within authorized zones. Off-trail riding is prohibited.\n" +
      "4. The customer is liable for any physical damage, loss, or theft of the ATV during the rental period.\n" +
      "5. Security deposits will be forfeited in case of vehicle abuse or rule violations.\n" +
      "Insurance and Customer Responsibility: The customer is fully responsible for the cost of repair up to the full replacement value of the ATV.";

    const termsTextES = 
      "Por la presente reconozco que operar un Vehículo Todo Terreno (ATV) / Cuatro Ruedas es una actividad de alto riesgo. Acepto usar casco en todo momento, seguir todas las instrucciones de seguridad y asumir total responsabilidad financiera por cualquier daño causado al vehículo. Eximo a The Granja Xtreme de cualquier responsabilidad por lesiones personales sufridas durante la duración del alquiler.\n\n" +
      "1. El casco es obligatorio para todos los operadores y pasajeros. Se proporciona equipo de seguridad y debe usarse correctamente.\n" +
      "2. Se prohíbe la operación bajo la influencia de drogas, alcohol o medicamentos que causen deterioro.\n" +
      "3. Todos los conductores deben permanecer estrictamente dentro de las zonas autorizadas. Prohibido conducir fuera del sendero.\n" +
      "4. El cliente es responsable de cualquier daño físico, pérdida o robo del ATV durante el período de alquiler.\n" +
      "5. Los depósitos de seguridad se perderán en caso de abuso del vehículo o violaciones de las reglas.\n" +
      "Seguro y Responsabilidad del Cliente: El cliente es totalmente responsable del costo de reparación hasta el valor total de reemplazo del ATV.";
    
    doc.text(language === 'ES' ? termsTextES : termsTextEN, { align: 'justify', lineGap: 4 });
    
    doc.moveDown(2);
    
    // Signatures
    doc.fillColor('#111827')
       .font('Helvetica-Bold')
       .fontSize(12)
       .text(language === 'ES' ? 'AUTORIZACIÓN DE FIRMA' : 'DIGITAL SIGNATURE AUTHORIZATION');
    
    doc.font('Helvetica')
       .fontSize(10)
       .text(language === 'ES' ? `Firmado por: ${clientName}` : `Signed by: ${clientName}`);
    doc.text(language === 'ES' ? `Fecha: ${formatTZDate(waiver.createdAt)}` : `Date Signed: ${formatTZDate(waiver.createdAt)}`);
    
    if (waiver.agreedToTerms) {
      doc.moveDown(1);
      doc.text(language === 'ES' ? '[✓] Acepto los términos y condiciones' : '[✓] I agree to the terms and conditions');
    }

    doc.moveDown(3);
    const startSigY = doc.y;
    
    // Attempt to load customer signature
    if (booking.customerSignature) {
      fetch(booking.customerSignature)
        .then(res => res.arrayBuffer())
        .then(buffer => {
          doc.image(Buffer.from(buffer), 50, startSigY - 40, { fit: [150, 50] });
          doc.text('_____________________________', 50, startSigY);
          doc.text(language === 'ES' ? 'Firma del Cliente' : 'Customer Signature', 50, startSigY + 15);
          if (booking.customerSignedAt) {
            doc.text(`Signed At: ${formatTZDateTime(booking.customerSignedAt)}`, 50, startSigY + 30);
          }
          
          if (booking.adminSignature) {
            fetch(booking.adminSignature)
              .then(res => res.arrayBuffer())
              .then(adminBuffer => {
                doc.image(Buffer.from(adminBuffer), 300, startSigY - 40, { fit: [150, 50] });
                doc.text('_____________________________', 300, startSigY);
                doc.text(language === 'ES' ? 'Firma del Representante' : 'Representative Signature', 300, startSigY + 15);
                if (booking.adminSignedAt) {
                  doc.text(`Signed At: ${formatTZDateTime(booking.adminSignedAt)}`, 300, startSigY + 30);
                }
                doc.end();
              }).catch(() => {
                doc.text('_____________________________', 300, startSigY);
                doc.text(language === 'ES' ? 'Firma del Representante' : 'Representative Signature', 300, startSigY + 15);
                doc.end();
              });
          } else {
            doc.text('_____________________________', 300, startSigY);
            doc.text(language === 'ES' ? 'Firma del Representante' : 'Representative Signature', 300, startSigY + 15);
            doc.end();
          }
        })
        .catch(() => {
          doc.text('_____________________________', 50, startSigY);
          doc.text(language === 'ES' ? 'Firma del Cliente' : 'Customer Signature', 50, startSigY + 15);
          doc.text('_____________________________', 300, startSigY);
          doc.text(language === 'ES' ? 'Firma del Representante' : 'Representative Signature', 300, startSigY + 15);
          doc.end();
        });
    } else {
      doc.text('_____________________________', 50, startSigY);
      doc.text(language === 'ES' ? 'Firma del Cliente' : 'Customer Signature', 50, startSigY + 15);
      
      doc.text('_____________________________', 300, startSigY);
      doc.text(language === 'ES' ? 'Firma del Representante' : 'Representative Signature', 300, startSigY + 15);
      
      doc.end();
    }
  });
};

export const generateReceiptPDF = async (booking: any): Promise<Buffer> => {
  // Fetch associated invoices and payments
  const invoices = await Invoice.find({ bookingId: booking._id });
  const payments = await Payment.find({ bookingId: booking._id });

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];
    
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', (err) => reject(err));
    
    // Title
    doc.fillColor('#396759') // Forest Green
       .font('Helvetica-Bold')
       .fontSize(22)
       .text('THE GRANJA XTREME', { align: 'center' });
    doc.moveDown(0.2);
    doc.fillColor('#4d6700') // Moss Green
       .fontSize(14)
       .text('RENTAL INVOICE & RECEIPT', { align: 'center' });
    
    doc.moveDown(1.5);
    
    // Invoice details
    const displayReceiptNo = payments.length > 0 ? payments[0].receiptNumber : 'N/A';
    doc.fillColor('#111827')
       .font('Helvetica-Bold')
       .fontSize(12)
       .text(`RECEIPT NO: ${displayReceiptNo}`);
    doc.text(`BOOKING NO: ${booking.bookingNumber}`);
    doc.font('Helvetica')
       .fontSize(10);
    doc.moveDown(0.4);
    
    const clientName = booking.customerId ? `${booking.customerId.firstName} ${booking.customerId.lastName}` : 'Guest';
    doc.text(`Customer Name: ${clientName}`);
    doc.text(`Passport / ID: ${booking.customerId?.passport || 'N/A'}`);
    doc.text(`Date Issued: ${formatTZDate(new Date())}`);
    doc.text(`ATV Model: ${formatAtvName(booking.atvId)}`);
    doc.text(`Scheduled: ${formatTZDateTime(booking.startDate)} to ${formatTZDateTime(booking.endDate)}`);
    doc.text(`Actual Times: ${booking.actualCheckInTime ? formatTZDateTime(booking.actualCheckInTime) : 'N/A'} to ${booking.actualCheckOutTime ? formatTZDateTime(booking.actualCheckOutTime) : 'N/A'}`);
    
    doc.moveDown(1.5);
    
    // Table Headers
    doc.font('Helvetica-Bold')
       .text('Description', 50, doc.y)
       .text('Amount', 460, doc.y);
    
    doc.moveDown(0.4);
    doc.font('Helvetica');
    let startY = doc.y;
    
    // Draw line
    doc.moveTo(50, startY - 2).lineTo(530, startY - 2).strokeColor('#e5e7eb').stroke();
    
    let totalDue = 0;

    // Loop through invoices
    for (const inv of invoices) {
      doc.text(inv.description || inv.invoiceType, 50, startY + 5)
         .text(`$${inv.amount.toFixed(2)}`, 460, startY + 5);
      totalDue += inv.amount;
      startY += 20;
    }

    if (invoices.length === 0) {
      doc.text('No invoices generated for this booking yet.', 50, startY + 5);
      startY += 20;
    }
       
    if (booking.depositRefunded) {
      doc.font('Helvetica-Bold')
         .text(`Security Deposit Refunded`, 50, startY + 5)
         .text(`+$${(booking.depositRefundedAmount || 0).toFixed(2)}`, 460, startY + 5);
      // Not subtracting from totalDue here anymore because the invoice amount was already reduced during checkout
      // totalDue -= (booking.depositRefundedAmount || 0);
      startY += 20;
      doc.font('Helvetica');
    }

    doc.moveTo(50, startY + 5).lineTo(530, startY + 5).strokeColor('#9ca3af').stroke();
    
    let totalPaid = payments.reduce((acc, p) => acc + p.amount, 0);
    let remainingBalance = totalDue - totalPaid;

    doc.font('Helvetica-Bold')
       .text('Total Amount:', 300, startY + 15)
       .text(`$${totalDue.toFixed(2)}`, 460, startY + 15);
       
    doc.font('Helvetica')
       .text('Amount Paid:', 300, startY + 30)
       .text(`$${totalPaid.toFixed(2)}`, 460, startY + 30);

    doc.font('Helvetica-Bold')
       .text('Remaining Balance:', 300, startY + 45)
       .text(`$${remainingBalance.toFixed(2)}`, 460, startY + 45);
    
    doc.moveDown(4);
    
    doc.font('Helvetica-Bold').fontSize(10).text('Payment History:', 50, doc.y);
    doc.font('Helvetica');
    if (payments.length > 0) {
      for (const p of payments) {
        doc.text(`- ${p.receiptNumber}: $${p.amount.toFixed(2)} via ${p.paymentMethod} on ${formatTZDateTime(p.collectionDate)}`, 50, doc.y);
      }
    } else {
      doc.text('No payments recorded.', 50, doc.y);
    }
    
    doc.moveDown(3);
    const startSigY = doc.y;

    if (booking.customerSignature) {
      fetch(booking.customerSignature)
        .then(res => res.arrayBuffer())
        .then(buffer => {
          doc.image(Buffer.from(buffer), 50, startSigY - 40, { fit: [150, 50] });
          doc.text('_____________________________', 50, startSigY);
          doc.text('Customer Signature', 50, startSigY + 15);
          doc.end();
        })
        .catch(() => {
          doc.text('_____________________________', 50, startSigY);
          doc.text('Customer Signature', 50, startSigY + 15);
          doc.end();
        });
    } else {
      doc.text('_____________________________', 50, startSigY);
      doc.text('Customer Signature', 50, startSigY + 15);
      doc.end();
    }
  });
};
