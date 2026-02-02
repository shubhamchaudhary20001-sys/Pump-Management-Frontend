/**
 * Generates an HTML string for the transaction invoice.
 * @param {Object} transaction - The transaction object containing fuel, user, organisation details.
 * @returns {string} HTML string of the invoice.
 */
export const getInvoiceHtml = (transaction) => {
  const {
    _id,
    transactionDate,
    user,
    organisation,
    fuel,
    quantity,
    totalPrice,
    vehicleNumber,
    notes
  } = transaction;

  const date = new Date(transactionDate).toLocaleDateString();
  const amount = parseFloat(totalPrice).toFixed(2);
  const rate = fuel ? fuel.rate.toFixed(2) : '0.00';
  const fuelName = fuel ? fuel.name : 'Fuel';
  const userName = user ? `${user.firstname} ${user.lastname}` : 'N/A';
  const orgName = organisation ? organisation.name : 'N/A';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Invoice #${_id.slice(-6)}</title>
      <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #555; padding: 20px; }
        .invoice-box {
          max-width: 800px;
          margin: auto;
          padding: 30px;
          border: 1px solid #eee;
          box-shadow: 0 0 10px rgba(0, 0, 0, 0.15);
          font-size: 16px;
          line-height: 24px;
        }
        .invoice-box table { width: 100%; line-height: inherit; text-align: left; border-collapse: collapse; }
        .invoice-box table td { padding: 5px; vertical-align: top; }
        .invoice-box table tr td:nth-child(2) { text-align: right; }
        .title { font-size: 45px; line-height: 45px; color: #333; }
        .header-row td { border-bottom: 2px solid #eee; padding-bottom: 20px; }
        .item-row td { border-bottom: 1px solid #eee; }
        .item-row.last td { border-bottom: none; }
        .total-row td { border-top: 2px solid #eee; font-weight: bold; }
        
        @media only screen and (max-width: 600px) {
          .invoice-box table tr.top table td { width: 100%; display: block; text-align: center; }
          .invoice-box table tr.information table td { width: 100%; display: block; text-align: center; }
        }
        
        /* Print handling */
        @media print {
          .no-print { display: none; }
          body { padding: 0; }
          .invoice-box { box-shadow: none; border: 0; }
        }
      </style>
    </head>
    <body>
      <div class="invoice-box">
        <table cellpadding="0" cellspacing="0">
          <tr class="top">
            <td colspan="2">
              <table>
                <tr>
                  <td class="title">
                    ⛽ Petrol Management
                  </td>
                  <td>
                    Invoice #: ${_id.slice(-6).toUpperCase()}<br>
                    Date: ${date}<br>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <tr class="information">
            <td colspan="2">
              <table>
                <tr>
                  <td>
                    <strong>Bill To:</strong><br>
                    ${userName}<br>
                    ${orgName}
                  </td>
                  <td>
                    <strong>Vehicle No:</strong><br>
                    ${vehicleNumber || 'N/A'}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <tr class="heading">
             <td style="background: #eee; border-bottom: 1px solid #ddd; font-weight: bold;">Item</td>
             <td style="background: #eee; border-bottom: 1px solid #ddd; font-weight: bold;">Price</td>
          </tr>
          
          <tr class="item-row">
            <td>
              ${fuelName} (Quantity: ${quantity} Ltr @ ${rate})
            </td>
            <td>
              ₹${amount}
            </td>
          </tr>

          ${notes ? `
          <tr class="item-row">
            <td colspan="2" style="font-size: 14px; color: #777;">
              Notes: ${notes}
            </td>
          </tr>
          ` : ''}
          
          <tr class="total-row">
            <td></td>
            <td>
              Total: ₹${amount}
            </td>
          </tr>
        </table>
        
        <br><br>
        <div style="text-align: center; font-size: 12px; color: #aaa; margin-top: 40px;">
          <p>Thank you for your business!</p>
          <p>This is a computer-generated invoice and does not require a signature.</p>
        </div>
      </div>
      
      <div class="no-print" style="text-align: center; margin-top: 20px;">
        <button onclick="window.print()" style="padding: 10px 20px; cursor: pointer; background: #007bff; color: white; border: none; border-radius: 5px;">Print / Save as PDF</button>
      </div>
      
      <script>
        // Auto-print when opened
        window.onload = function() { setTimeout(function() { window.print(); }, 500); }
      </script>
    </body>
    </html>
  `;
};

/**
 * Generates an HTML string for a consolidated transaction report/invoice.
 * @param {Array} transactions - List of transactions.
 * @param {Object} filters - Applied filters (startDate, endDate, etc.).
 * @param {Object} user - Current user requesting the report.
 * @param {Object} branding - Branding info { stationName, logoUrl }.
 * @returns {string} HTML string.
 */
export const getConsolidatedInvoiceHtml = (transactions, filters, user, branding = {}) => {
  const startDate = filters.startDate ? new Date(filters.startDate).toLocaleDateString() : 'Beginning';
  const endDate = filters.endDate ? new Date(filters.endDate).toLocaleDateString() : 'Present';
  const currentDate = new Date().toLocaleDateString();

  const stationName = branding.stationName || 'Petrol Management';
  const logoUrl = branding.logoUrl || 'https://cdn-icons-png.flaticon.com/512/2965/2965879.png'; // Default Gas Station Icon

  const totalAmount = transactions.reduce((sum, t) => sum + (t.totalPrice || 0), 0).toFixed(2);
  const totalQuantity = transactions.reduce((sum, t) => sum + (t.quantity || 0), 0).toFixed(2);

  const rows = transactions.map((t, index) => {
    const date = new Date(t.transactionDate).toLocaleDateString();
    const fuelName = t.fuel?.name || 'Fuel';
    const quantity = t.quantity;
    const rate = t.fuel?.rate || 0;
    const amount = t.totalPrice?.toFixed(2) || '0.00';
    const vehicle = t.vehicleNumber || t.vehicleType || '-';
    const purchaser = t.user ? `${t.user.firstname} ${t.user.lastname}` : 'N/A';
    const salesman = t.assignedTo ? `${t.assignedTo.firstname} ${t.assignedTo.lastname}` : '-';

    return `
      <tr class="item-row">
        <td>${index + 1}</td>
        <td>${date}</td>
        <td>${purchaser}</td>
        <td>${vehicle}</td>
        <td>${fuelName}</td>
        <td>${salesman}</td>
        <td style="text-align: right;">${quantity}</td>
        <td style="text-align: right;">${rate}</td>
        <td style="text-align: right;">${amount}</td>
      </tr>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Consolidated Invoice</title>
      <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; padding: 20px; font-size: 14px; }
        .invoice-box { max-width: 1000px; margin: auto; padding: 20px; }
        
        .header-container { display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px; border-bottom: 2px solid #e55a2b; padding-bottom: 20px; }
        .header-left { flex: 1; }
        .header-center { flex: 2; text-align: center; }
        .header-right { flex: 1; text-align: right; }
        
        .header-center h1 { margin: 0; color: #e55a2b; font-size: 28px; text-transform: uppercase; letter-spacing: 1px; }
        .header-center p { margin: 5px 0; color: #777; font-size: 16px; font-weight: bold; }

        .logo { max-height: 80px; max-width: 150px; object-fit: contain; }
        
        .meta-info { display: flex; justify-content: space-between; margin-bottom: 20px; border-bottom: 1px solid #ddd; padding-bottom: 10px; background: #f9f9f9; padding: 15px; border-radius: 5px; }
        .meta-info div { flex: 1; }
        .meta-info .right { text-align: right; }

        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th, td { padding: 10px; border-bottom: 1px solid #eee; text-align: left; }
        th { background-color: #333; color: white; font-weight: bold; }
        .total-row td { border-top: 2px solid #333; font-weight: bold; font-size: 16px; background-color: #f8f9fa; }
        
        @media print {
          .no-print { display: none; }
          body { padding: 0; margin: 0; }
          .invoice-box { width: 100%; max-width: none; }
          .meta-info { background: none; border: 1px solid #ddd; }
          th { background-color: #eee !important; color: #333 !important; -webkit-print-color-adjust: exact; }
        }
      </style>
    </head>
    <body>
      <div class="invoice-box">
        <div class="header-container">
            <div class="header-left">
                <!-- Spacer or additional left info -->
            </div>
            <div class="header-center">
                <h1>${stationName}</h1>
                <p>Consolidated Transaction Report</p>
            </div>
            <div class="header-right">
                <img src="${logoUrl}" alt="Station Logo" class="logo" onerror="this.style.display='none'">
            </div>
        </div>

        <div class="meta-info">
          <div>
            <strong>Generated By:</strong> ${user.firstname} ${user.lastname}<br>
            <strong>Role:</strong> ${user.role}
          </div>
          <div class="right">
            <strong>Statement Period:</strong><br>
             ${startDate} to ${endDate}<br>
             <strong>Date Generated:</strong> ${currentDate}
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Date</th>
              <th>Purchaser</th>
              <th>Vehicle</th>
              <th>Fuel</th>
              <th>Salesman</th>
              <th style="text-align: right;">Qty</th>
              <th style="text-align: right;">Rate</th>
              <th style="text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
            <tr class="total-row">
              <td colspan="6" style="text-align: right;">Grand Total:</td>
              <td style="text-align: right;">${totalQuantity}</td>
              <td></td>
              <td style="text-align: right;">₹${totalAmount}</td>
            </tr>
          </tbody>
        </table>
        
        <div style="text-align: center; font-size: 12px; color: #aaa; margin-top: 40px; border-top: 1px solid #eee; padding-top: 20px;">
          <p>Generated by ${stationName} Management System</p>
        </div>
      </div>
      
      <div class="no-print" style="text-align: center; margin-top: 20px;">
        <button onclick="window.print()" style="padding: 10px 20px; cursor: pointer; background: #007bff; color: white; border: none; border-radius: 5px;">Print / Save as PDF</button>
      </div>
       <script>
        // Auto-print when opened
        window.onload = function() { setTimeout(function() { window.print(); }, 500); }
      </script>
    </body>
    </html>
  `;
};
