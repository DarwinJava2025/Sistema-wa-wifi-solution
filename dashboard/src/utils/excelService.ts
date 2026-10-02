import * as XLSX from 'xlsx';
import type { CampaignContact, ScheduledCampaignType } from '../services/scheduledMessagesService';

/**
 * Excel & Spreadsheet Service
 * Generates styled, structured .xlsx files and parses uploaded Excel/CSV files.
 */

export interface ExcelColumnDefinition {
  header: string;
  key: string;
  width?: number;
}

/**
 * Download a formatted Excel (.xlsx) file
 */
export function downloadExcelWorkbook(
  filename: string,
  sheets: Array<{
    sheetName: string;
    columns?: ExcelColumnDefinition[];
    data: Array<Record<string, any>>;
    instructions?: string[];
  }>,
) {
  const wb = XLSX.utils.book_new();

  sheets.forEach(({ sheetName, columns, data, instructions }) => {
    let sheetRows: Array<Record<string, any>> = [];

    // Optional instruction banner rows
    if (instructions && instructions.length > 0) {
      // First rows as notes
      const notes = instructions.map(note => ({ [columns ? columns[0].header : 'Instrucciones']: `📌 ${note}` }));
      sheetRows = [...notes, {}, ...data];
    } else {
      sheetRows = data;
    }

    const ws = XLSX.utils.json_to_sheet(sheetRows);

    // Set column widths if provided
    if (columns) {
      ws['!cols'] = columns.map(col => ({ wch: col.width || 20 }));
    }

    XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31));
  });

  XLSX.writeFile(wb, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
}

/**
 * Generate context-aware Excel template for Scheduled Messages (Mensajes Programados)
 */
export function downloadScheduledMessagesExcelTemplate(type: ScheduledCampaignType = 'notice') {
  let filename = 'plantilla_mensajes_programados.xlsx';
  let sheetName = 'Contactos_Programados';
  let sampleData: Array<Record<string, any>> = [];

  const instructions = [
    'Complete las columnas con los datos de sus clientes.',
    'Formato de Teléfono: Código de país + número (ej. 584121234567, 573001234567). Sin signos ni espacios.',
    'Formato de Fecha: AAAA-MM-DD (ej. 2026-09-25) o DD/MM/AAAA.',
    'Las columnas personalizadas (Plan, Monto, etc.) se pueden usar en su plantilla con {plan}, {monto}, {fecha}, {nombre}.',
  ];

  if (type === 'birthday') {
    filename = 'plantilla_cumpleanos_clientes.xlsx';
    sheetName = 'Cumpleanos';
    sampleData = [
      {
        Nombre: 'Carlos Alberto Perez',
        Telefono_WhatsApp: '584121234567',
        Fecha_Cumpleanos: '1990-09-25',
        Plan_Contratado: 'Fibra 100 Mbps',
        Descuento_Regalo: '10% de descuento en tu próxima factura',
      },
      {
        Nombre: 'Maria Elena Gomez',
        Telefono_WhatsApp: '584149876543',
        Fecha_Cumpleanos: '1995-10-14',
        Plan_Contratado: 'Fibra 50 Mbps',
        Descuento_Regalo: '1 mes gratis de aumento a 200 Mbps',
      },
      {
        Nombre: 'Roberto Sanchez Diaz',
        Telefono_WhatsApp: '584245551234',
        Fecha_Cumpleanos: '1988-11-03',
        Plan_Contratado: 'Plan Gamer 200 Mbps',
        Descuento_Regalo: '15% de descuento en renovación',
      },
      {
        Nombre: 'Andrea Valentina Morales',
        Telefono_WhatsApp: '584167778899',
        Fecha_Cumpleanos: '2001-12-20',
        Plan_Contratado: 'Plan Residencial 50 Mbps',
        Descuento_Regalo: 'Bono especial de aniversario',
      },
    ];
  } else if (type === 'notice') {
    filename = 'plantilla_cobranzas_y_avisos.xlsx';
    sheetName = 'Avisos_y_Cobranzas';
    sampleData = [
      {
        Nombre: 'Alejandro Morales',
        Telefono_WhatsApp: '584120001122',
        Fecha_Vencimiento: '2026-09-30',
        Plan_Servicio: 'Fibra Óptica 100 Mbps',
        Monto_a_Pagar: '$35.00',
        Referencia_Contrato: 'CONT-10492',
      },
      {
        Nombre: 'Distribuidora Los Andes C.A.',
        Telefono_WhatsApp: '584143334455',
        Fecha_Vencimiento: '2026-09-28',
        Plan_Servicio: 'Plan Corporativo 200 Mbps + IP Fija',
        Monto_a_Pagar: '$80.00',
        Referencia_Contrato: 'CORP-8821',
      },
      {
        Nombre: 'Daniela Hernandez',
        Telefono_WhatsApp: '584248889900',
        Fecha_Vencimiento: '2026-10-05',
        Plan_Servicio: 'Fibra Residencial 50 Mbps',
        Monto_a_Pagar: '$25.00',
        Referencia_Contrato: 'CONT-11029',
      },
    ];
  } else {
    // offer / custom
    filename = 'plantilla_promociones_y_difusion.xlsx';
    sheetName = 'Promociones';
    sampleData = [
      {
        Nombre: 'Juan Jimenez',
        Telefono_WhatsApp: '584126667788',
        Fecha_Oferta: '2026-09-25',
        Plan_Actual: '50 Mbps',
        Plan_Promocion: 'Duplica tu velocidad a 100 Mbps por $5 extra',
        Codigo_Promo: 'PROMO-WIFI-2026',
      },
      {
        Nombre: 'Beatriz Ramirez',
        Telefono_WhatsApp: '584145556677',
        Fecha_Oferta: '2026-09-26',
        Plan_Actual: '100 Mbps',
        Plan_Promocion: 'Instalación de Router WiFi 6 con 50% desc.',
        Codigo_Promo: 'WIFI6-WISP',
      },
    ];
  }

  const columns: ExcelColumnDefinition[] = Object.keys(sampleData[0] || {}).map(key => ({
    header: key,
    key,
    width: key.length < 15 ? 20 : key.length + 6,
  }));

  downloadExcelWorkbook(filename, [
    {
      sheetName,
      columns,
      data: sampleData,
      instructions,
    },
  ]);
}

/**
 * Generate context-aware Excel template for Group Broadcasts (Difusión Masiva)
 */
export function downloadGroupBroadcastsExcelTemplate() {
  const sampleData = [
    {
      Nombre_Contacto: 'Carlos Mendoza',
      Telefono_WhatsApp: '584121234567',
      Zona_o_Sector: 'Sector Las Mercedes',
      Plan_Internet: '100 Mbps',
      Estado_Cliente: 'Activo',
    },
    {
      Nombre_Contacto: 'Inversiones El Sol',
      Telefono_WhatsApp: '584149876543',
      Zona_o_Sector: 'Centro Comercial Galerías',
      Plan_Internet: 'Corporativo 200 Mbps',
      Estado_Cliente: 'VIP',
    },
    {
      Nombre_Contacto: 'Patricia Rojas',
      Telefono_WhatsApp: '584245551234',
      Zona_o_Sector: 'Urb. Los Rosales',
      Plan_Internet: '50 Mbps',
      Estado_Cliente: 'Activo',
    },
  ];

  const columns: ExcelColumnDefinition[] = Object.keys(sampleData[0]).map(key => ({
    header: key,
    key,
    width: 24,
  }));

  downloadExcelWorkbook('plantilla_difusion_contactos.xlsx', [
    {
      sheetName: 'Destinatarios',
      columns,
      data: sampleData,
      instructions: [
        'Ingresa la lista de clientes o contactos que recibirán la difusión.',
        'La columna Telefono_WhatsApp debe contener solo números con código de país (ej. 584121234567).',
        'Las demás columnas se pueden usar como variables dinámicas {nombre_contacto}, {zona_o_sector}, etc.',
      ],
    },
  ]);
}

/**
 * Parse an uploaded file (.xlsx, .xls, .csv, .txt, .json) into standardized CampaignContact array
 */
export async function parseContactsFileUnified(file: File | string): Promise<{
  contacts: CampaignContact[];
  headers: string[];
  totalRows: number;
  invalidRows: number;
}> {
  // If a raw string is passed (e.g. manual copy-paste)
  if (typeof file === 'string') {
    return parseTextContent(file);
  }

  const fileName = file.name.toLowerCase();

  // Excel Binary formats (.xlsx, .xls)
  if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
    const arrayBuffer = await file.arrayBuffer();
    const wb = XLSX.read(arrayBuffer, { type: 'array' });
    const firstSheetName = wb.SheetNames[0];
    const ws = wb.Sheets[firstSheetName];
    const rawJson: Array<Record<string, any>> = XLSX.utils.sheet_to_json(ws, { defval: '' });

    return mapRawRowsToContacts(rawJson);
  }

  // CSV or Text file
  const text = await file.text();
  return parseTextContent(text);
}

/**
 * Map generic key-value rows from Excel or CSV to CampaignContact[]
 */
function mapRawRowsToContacts(rows: Array<Record<string, any>>): {
  contacts: CampaignContact[];
  headers: string[];
  totalRows: number;
  invalidRows: number;
} {
  const contacts: CampaignContact[] = [];
  let invalidRows = 0;
  const headerSet = new Set<string>();

  rows.forEach((row, idx) => {
    // Skip empty rows or instruction banner rows
    const values = Object.values(row);
    if (values.every(v => v === '' || v === null || v === undefined)) return;
    const firstVal = String(values[0] || '').trim();
    if (firstVal.startsWith('📌') || firstVal.startsWith('Instrucciones')) return;

    // Collect headers
    Object.keys(row).forEach(k => headerSet.add(k));

    // Find phone column
    let phone = '';
    let name = '';
    let date = '';
    const customData: Record<string, string> = {};

    Object.entries(row).forEach(([rawKey, val]) => {
      const key = rawKey.toLowerCase().trim().replace(/[\s_-]+/g, '');
      const strVal = String(val).trim();

      if (
        key.includes('telefono') ||
        key.includes('phone') ||
        key.includes('numero') ||
        key.includes('whatsapp') ||
        key.includes('movil') ||
        key.includes('celular')
      ) {
        if (!phone) phone = strVal;
      } else if (
        key.includes('nombre') ||
        key.includes('name') ||
        key.includes('cliente') ||
        key.includes('destinatario')
      ) {
        if (!name) name = strVal;
      } else if (
        key.includes('fecha') ||
        key.includes('date') ||
        key.includes('cumple') ||
        key.includes('vencimiento')
      ) {
        if (!date) date = strVal;
      } else {
        // Save as dynamic variable (e.g. plan, monto, codigo, etc.)
        const varKey = rawKey.toLowerCase().trim().replace(/\s+/g, '_');
        customData[varKey] = strVal;
      }
    });

    // Fallback if headers were unnamed (col 0, col 1)
    if (!phone && values.length >= 2) {
      const pCand = String(values[1]).replace(/[^0-9]/g, '');
      if (pCand.length >= 7) {
        name = String(values[0]).trim();
        phone = pCand;
        date = values[2] ? String(values[2]).trim() : '';
      }
    }

    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length >= 7) {
      contacts.push({
        id: `contact_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
        name: name || `Cliente ${cleanPhone}`,
        phone: cleanPhone,
        date: date,
        status: 'pending',
        customData: Object.keys(customData).length > 0 ? customData : undefined,
      });
    } else {
      invalidRows++;
    }
  });

  return {
    contacts,
    headers: Array.from(headerSet),
    totalRows: rows.length,
    invalidRows,
  };
}

/**
 * Helper to parse plain text or CSV strings
 */
function parseTextContent(text: string): {
  contacts: CampaignContact[];
  headers: string[];
  totalRows: number;
  invalidRows: number;
} {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) {
    return { contacts: [], headers: [], totalRows: 0, invalidRows: 0 };
  }

  // Check if JSON format
  if (text.trim().startsWith('[') && text.trim().endsWith(']')) {
    try {
      const json = JSON.parse(text);
      if (Array.isArray(json)) {
        return mapRawRowsToContacts(json);
      }
    } catch {
      // Fallback to line by line
    }
  }

  // Parse CSV / TSV / Delimited lines
  const delimiter = lines[0].includes(';') ? ';' : lines[0].includes('\t') ? '\t' : ',';
  const headerLine = lines[0];
  const hasHeaders =
    headerLine.toLowerCase().includes('nombre') ||
    headerLine.toLowerCase().includes('telefono') ||
    headerLine.toLowerCase().includes('name') ||
    headerLine.toLowerCase().includes('phone') ||
    headerLine.toLowerCase().includes('numero');

  const headers = hasHeaders
    ? headerLine.split(delimiter).map(h => h.trim().replace(/^["']|["']$/g, ''))
    : ['Nombre', 'Telefono', 'Fecha'];

  const dataLines = hasHeaders ? lines.slice(1) : lines;
  const rows: Array<Record<string, any>> = [];

  dataLines.forEach(line => {
    const cols = line.split(delimiter).map(c => c.trim().replace(/^["']|["']$/g, ''));
    if (cols.length === 0 || cols.every(c => !c)) return;

    const rowObj: Record<string, any> = {};
    headers.forEach((h, i) => {
      rowObj[h] = cols[i] || '';
    });
    rows.push(rowObj);
  });

  return mapRawRowsToContacts(rows);
}

/**
 * Generate context-aware Excel template for Knowledge Base / Price Lists (Tarifarios y Base de Conocimiento)
 */
export function downloadKnowledgeDocumentExcelTemplate() {
  const sampleData = [
    {
      Categoria: 'Fibra Residencial',
      Plan_Servicio: 'Plan Fibra Hogar 50M',
      Velocidad_Descarga_Subida: '50 Mbps Simétricos',
      Precio_Mensual_USD: '$25 / mes',
      Costo_Instalacion: '$10 (Gratis pagando 2 meses)',
      Equipos_Incluidos: 'Router ONT Dual Band 2.4/5GHz',
      Condiciones_y_SLA: 'Soporte 24/7, IP Dinámica, Sin permanencia forzosa',
    },
    {
      Categoria: 'Fibra Residencial',
      Plan_Servicio: 'Plan Fibra Pro 100M',
      Velocidad_Descarga_Subida: '100 Mbps Simétricos',
      Precio_Mensual_USD: '$35 / mes',
      Costo_Instalacion: 'Instalación Gratis',
      Equipos_Incluidos: 'Router Gigabit WiFi 5 + ONT',
      Condiciones_y_SLA: 'Streaming 4K garantizado, latencia < 15ms',
    },
    {
      Categoria: 'Fibra Gamer / Pro',
      Plan_Servicio: 'Plan Fibra Gamer 200M',
      Velocidad_Descarga_Subida: '200 Mbps Simétricos',
      Precio_Mensual_USD: '$50 / mes',
      Costo_Instalacion: 'Instalación Gratis',
      Equipos_Incluidos: 'Router WiFi 6 AX1800 Gigabit',
      Condiciones_y_SLA: 'Enrutamiento optimizado para Gaming/Twitch, IP Pública opcional',
    },
    {
      Categoria: 'Corporativo / Empresas',
      Plan_Servicio: 'Plan Corporativo Dedicado 500M',
      Velocidad_Descarga_Subida: '500 Mbps 1:1 Dedicado',
      Precio_Mensual_USD: '$90 / mes',
      Costo_Instalacion: 'Instalación Gratis',
      Equipos_Incluidos: 'Router Mikrotik / Fibra Troncal',
      Condiciones_y_SLA: 'SLA 99.9%, IP Fija /29 incluida, Soporte VIP dedicado',
    },
    {
      Categoria: 'Servicios Adicionales',
      Plan_Servicio: 'Router WiFi 6 Mesh Extender',
      Velocidad_Descarga_Subida: 'Hasta 1.8 Gbps WiFi',
      Precio_Mensual_USD: '$45 pago único',
      Costo_Instalacion: 'Configuración e instalación incluida',
      Equipos_Incluidos: 'Extensor Mesh AX1800',
      Condiciones_y_SLA: 'Ampliación de cobertura para casas grandes / oficinas',
    },
  ];

  const columns: ExcelColumnDefinition[] = Object.keys(sampleData[0]).map(key => ({
    header: key,
    key,
    width: key.length < 18 ? 24 : key.length + 6,
  }));

  downloadExcelWorkbook('plantilla_tarifario_y_servicios_wifi.xlsx', [
    {
      sheetName: 'Tarifario_Planes',
      columns,
      data: sampleData,
      instructions: [
        'Este archivo sirve como base de conocimientos oficial para que los bots de IA coticen y respondan a los clientes.',
        'Puedes agregar tantas filas y columnas como necesites (promociones, requisitos de contratación, zonas de cobertura).',
      ],
    },
  ]);
}

/**
 * Export Audit Logs to formatted Excel (.xlsx)
 */
export function downloadLogsExcel(logs: Array<Record<string, any>>, filename: string = 'openwa-logs.xlsx') {
  if (logs.length === 0) return;

  const data = logs.map(log => ({
    Fecha_Hora: log.createdAt ? new Date(log.createdAt).toLocaleString() : '',
    Accion: log.action || '',
    Severidad: (log.severity || '').toUpperCase(),
    Sesion_Bot: log.sessionName || log.sessionId || 'Sistema',
    API_Key: log.apiKeyName || log.apiKeyId || 'N/A',
    Direccion_IP: log.ipAddress || '',
    Metodo_HTTP: log.method || '',
    Ruta_Endpoint: log.path || '',
    Codigo_Estado: log.statusCode || '',
    Mensaje_Error_Detalle: log.errorMessage || 'OK',
  }));

  const columns: ExcelColumnDefinition[] = [
    { header: 'Fecha_Hora', key: 'Fecha_Hora', width: 22 },
    { header: 'Accion', key: 'Accion', width: 26 },
    { header: 'Severidad', key: 'Severidad', width: 14 },
    { header: 'Sesion_Bot', key: 'Sesion_Bot', width: 20 },
    { header: 'API_Key', key: 'API_Key', width: 20 },
    { header: 'Direccion_IP', key: 'Direccion_IP', width: 18 },
    { header: 'Metodo_HTTP', key: 'Metodo_HTTP', width: 14 },
    { header: 'Ruta_Endpoint', key: 'Ruta_Endpoint', width: 28 },
    { header: 'Codigo_Estado', key: 'Codigo_Estado', width: 15 },
    { header: 'Mensaje_Error_Detalle', key: 'Mensaje_Error_Detalle', width: 35 },
  ];

  downloadExcelWorkbook(filename, [
    {
      sheetName: 'Registro_Auditoria',
      columns,
      data,
    },
  ]);
}

/**
 * Parse any file (.xlsx, .xls, .csv, .txt, .json, .md) into text/markdown for Knowledge Base
 */
export async function parseKnowledgeFileUnified(file: File): Promise<{
  content: string;
  name: string;
  size: number;
  isPriceList: boolean;
}> {
  const fileName = file.name.toLowerCase();
  const isPriceList =
    fileName.includes('precio') ||
    fileName.includes('tarif') ||
    fileName.includes('plan') ||
    fileName.includes('cotiz') ||
    fileName.includes('costo') ||
    fileName.endsWith('.xlsx') ||
    fileName.endsWith('.xls') ||
    fileName.endsWith('.csv');

  if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
    const arrayBuffer = await file.arrayBuffer();
    const wb = XLSX.read(arrayBuffer, { type: 'array' });
    let fullText = `=== DOCUMENTO DE EXCEL: ${file.name} ===\n\n`;

    wb.SheetNames.forEach(sheetName => {
      const ws = wb.Sheets[sheetName];
      fullText += `## Hoja: ${sheetName}\n\n`;
      // Convert sheet to formatted CSV / Markdown table text
      const csv = XLSX.utils.sheet_to_csv(ws);
      fullText += csv + '\n\n';
    });

    return {
      content: fullText.trim(),
      name: file.name,
      size: file.size,
      isPriceList,
    };
  }

  const text = await file.text();
  return {
    content: text,
    name: file.name,
    size: file.size,
    isPriceList,
  };
}

/**
 * Export Sessions / Bots list to Excel
 */
export function downloadSessionsReportExcel(sessions: Array<any>) {
  const filename = `reporte_sesiones_bots_${new Date().toISOString().slice(0, 10)}.xlsx`;
  const columns: ExcelColumnDefinition[] = [
    { header: 'Nombre_Sesion', key: 'Nombre_Sesion', width: 22 },
    { header: 'Telefono_WhatsApp', key: 'Telefono_WhatsApp', width: 20 },
    { header: 'Estado_Conexion', key: 'Estado_Conexion', width: 16 },
    { header: 'ID_Sesion', key: 'ID_Sesion', width: 30 },
    { header: 'Fecha_Creacion', key: 'Fecha_Creacion', width: 20 },
    { header: 'Ultima_Actividad', key: 'Ultima_Actividad', width: 20 },
  ];

  const data = (sessions || []).map(s => ({
    Nombre_Sesion: s.name || 'Sin nombre',
    Telefono_WhatsApp: s.phone ? `+${s.phone}` : 'Sin vincular',
    Estado_Conexion: s.status === 'ready' ? 'CONECTADO (ONLINE)' : s.status?.toUpperCase() || 'DESCONECTADO',
    ID_Sesion: s.id,
    Fecha_Creacion: s.createdAt ? new Date(s.createdAt).toLocaleString() : '—',
    Ultima_Actividad: s.lastActive ? new Date(s.lastActive).toLocaleString() : 'Nunca',
  }));

  downloadExcelWorkbook(filename, [
    {
      sheetName: 'Sesiones_WhatsApp',
      columns,
      data,
      instructions: [
        'Reporte consolidado de sesiones y bots de WhatsApp en WiFi Solution Pro.',
        `Generado el: ${new Date().toLocaleString()}`,
        `Total de sesiones exportadas: ${sessions.length}`,
      ],
    },
  ]);
}

/**
 * Export Dashboard & Performance Summary to Excel
 */
export function downloadDashboardSummaryExcel(stats: any, overview: any, sessions: Array<any>) {
  const filename = `resumen_dashboard_${new Date().toISOString().slice(0, 10)}.xlsx`;

  const summaryData = [
    { Metrica: 'Sesiones Conectadas (Online)', Valor: stats?.ready ?? 0, Detalle: 'Líneas listas para enviar y recibir' },
    { Metrica: 'Sesiones en Ejecución', Valor: stats?.active ?? 0, Detalle: 'Procesos de WhatsApp activos' },
    { Metrica: 'Total de Sesiones Creadas', Valor: stats?.total ?? sessions.length, Detalle: 'Total de bots registrados en el sistema' },
    { Metrica: 'Mensajes Procesados Hoy', Valor: overview?.messages?.today ? overview.messages.today.sent + overview.messages.today.received : 0, Detalle: 'Salientes y entrantes durante el día actual' },
    { Metrica: 'Mensajes Salientes Enviados', Valor: overview?.messages?.sent ?? 0, Detalle: 'Total histórico enviado a clientes' },
    { Metrica: 'Mensajes Entrantes Recibidos', Valor: overview?.messages?.received ?? 0, Detalle: 'Total histórico de mensajes de clientes' },
    { Metrica: 'Mensajes Fallidos', Valor: overview?.messages?.failed ?? 0, Detalle: 'Errores de entrega registrados' },
  ];

  const sessionsData = (sessions || []).map(s => ({
    Bot_Nombre: s.name,
    Telefono: s.phone ? `+${s.phone}` : 'Sin vincular',
    Estado: s.status === 'ready' ? 'Online' : s.status,
    ID: s.id,
    Ultima_Actividad: s.lastActive ? new Date(s.lastActive).toLocaleString() : 'Nunca',
  }));

  downloadExcelWorkbook(filename, [
    {
      sheetName: 'Metricas_Generales',
      columns: [
        { header: 'Metrica', key: 'Metrica', width: 32 },
        { header: 'Valor', key: 'Valor', width: 16 },
        { header: 'Detalle', key: 'Detalle', width: 45 },
      ],
      data: summaryData,
    },
    {
      sheetName: 'Estado_De_Bots',
      columns: [
        { header: 'Bot_Nombre', key: 'Bot_Nombre', width: 22 },
        { header: 'Telefono', key: 'Telefono', width: 20 },
        { header: 'Estado', key: 'Estado', width: 15 },
        { header: 'ID', key: 'ID', width: 28 },
        { header: 'Ultima_Actividad', key: 'Ultima_Actividad', width: 22 },
      ],
      data: sessionsData,
    },
  ]);
}

