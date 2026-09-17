import { useState, useRef } from 'react';
import { Upload, FileText, Globe, Trash2, Plus, Eye, FileSpreadsheet } from 'lucide-react';
import type { KnowledgeDocument, KnowledgeUrl } from '../../services/aiAssistant';
import './KnowledgeManager.css';

interface KnowledgeManagerProps {
  documents: KnowledgeDocument[];
  urls: KnowledgeUrl[];
  onDocumentsChange: (docs: KnowledgeDocument[]) => void;
  onUrlsChange: (urls: KnowledgeUrl[]) => void;
}

const SAMPLE_PRICE_LIST_CSV = `Plan / Servicio,Velocidad,Precio Mensual,Instalacion,Caracteristicas
Plan Fibra Hogar 50M,50 Mbps Simétricos,$25 / mes,$10 (Gratis si pagas 2 meses),WiFi Doble Banda + Soporte 24/7
Plan Fibra Pro 100M,100 Mbps Simétricos,$35 / mes,Gratis,Streaming 4K + Router Gigabit
Plan Fibra Gamer 200M,200 Mbps Simétricos,$50 / mes,Gratis,Baja latencia + IP pública opcional
Plan Corporativo 500M,500 Mbps Simétricos,$90 / mes,Gratis,Enlace dedicado + SLA 99.9%
Router WiFi 6 Adicional,AX1800,$45 pago único,Incluida,Cobertura extendida Mesh
Punto de Red Adicional,Cat6 Gigabit,$15 pago único,Incluida,Cableado estructurado hasta 20m`;

export function KnowledgeManager({
  documents,
  urls,
  onDocumentsChange,
  onUrlsChange,
}: KnowledgeManagerProps) {
  const [isPriceList, setIsPriceList] = useState(true);
  const [urlInput, setUrlInput] = useState('');
  const [urlTitleInput, setUrlTitleInput] = useState('');
  const [viewingDoc, setViewingDoc] = useState<KnowledgeDocument | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file uploads (txt, csv, json, md, etc.)
  const handleFileUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = e => {
        const content = (e.target?.result as string) || '';
        const newDoc: KnowledgeDocument = {
          id: 'doc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
          name: file.name,
          size: file.size,
          type: file.type || 'text/plain',
          uploadedAt: new Date().toISOString(),
          isPriceList,
          content,
        };
        onDocumentsChange([...documents, newDoc]);
      };
      reader.readAsText(file);
    });
  };

  const handleRemoveDoc = (id: string) => {
    onDocumentsChange(documents.filter(d => d.id !== id));
    if (viewingDoc?.id === id) setViewingDoc(null);
  };

  const handleAddSamplePriceList = () => {
    const sampleDoc: KnowledgeDocument = {
      id: 'doc_sample_' + Date.now(),
      name: 'Tarifario_Oficial_Planes_Fibra.csv',
      size: SAMPLE_PRICE_LIST_CSV.length,
      type: 'text/csv',
      uploadedAt: new Date().toISOString(),
      isPriceList: true,
      content: SAMPLE_PRICE_LIST_CSV,
    };
    onDocumentsChange([...documents, sampleDoc]);
  };

  const handleAddUrl = () => {
    if (!urlInput.trim()) return;
    let validUrl = urlInput.trim();
    if (!/^https?:\/\//i.test(validUrl)) {
      validUrl = 'https://' + validUrl;
    }

    const newUrl: KnowledgeUrl = {
      id: 'url_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      url: validUrl,
      title: urlTitleInput.trim() || validUrl,
      addedAt: new Date().toISOString(),
    };

    onUrlsChange([...urls, newUrl]);
    setUrlInput('');
    setUrlTitleInput('');
  };

  const handleRemoveUrl = (id: string) => {
    onUrlsChange(urls.filter(u => u.id !== id));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="knowledge-manager-container">
      {/* Overview & explanation */}
      <div>
        <h3 className="section-heading">Base de Conocimientos, Documentos y Precios</h3>
        <p className="section-subheading">
          Sube archivos de precios (CSV, TXT, Excel/JSON), manuales o URLs web. La IA los consultará automáticamente al responder a los clientes.
        </p>
      </div>

      {/* Quick Action: Sample Price List */}
      <div className="quick-price-bar">
        <div className="quick-price-info">
          <FileSpreadsheet size={18} className="quick-price-icon" />
          <span>¿Quieres cargar un tarifario de ejemplo para probar cotizaciones de inmediato?</span>
        </div>
        <button
          type="button"
          className="btn-template-pill highlight"
          onClick={handleAddSamplePriceList}
        >
          <Plus size={14} /> Cargar Tarifario de Ejemplo (.CSV)
        </button>
      </div>

      {/* File Upload Dropzone */}
      <div
        className={`file-dropzone ${isDragging ? 'dragging' : ''}`}
        onDragOver={e => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={e => {
          e.preventDefault();
          setIsDragging(false);
          handleFileUpload(e.dataTransfer.files);
        }}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".txt,.csv,.json,.md,.pdf,.doc,.docx,.xls,.xlsx"
          style={{ display: 'none' }}
          onChange={e => handleFileUpload(e.target.files)}
        />
        <div className="dropzone-icon-box">
          <Upload size={24} />
        </div>
        <div className="dropzone-text">
          <span className="dropzone-title">Haz clic aquí o arrastra tus archivos de precios y documentos</span>
          <span className="dropzone-subtitle">Soporta listas de precios .CSV, .TXT, .JSON, .MD, manuales y catálogos</span>
        </div>
      </div>

      {/* Tag as price list toggle */}
      <div className="price-tag-toggle-row">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={isPriceList}
            onChange={e => setIsPriceList(e.target.checked)}
          />
          <span className="checkbox-text">
            Marcar próximos archivos como <strong>Lista de Precios / Tarifario Oficial</strong> (prioridad para ventas y cotizaciones)
          </span>
        </label>
      </div>

      {/* Uploaded Documents List */}
      {documents.length > 0 && (
        <div className="attached-assets-section">
          <h4 className="assets-section-title">
            <FileText size={16} /> Archivos Adjuntos ({documents.length})
          </h4>
          <div className="assets-grid">
            {documents.map(doc => (
              <div key={doc.id} className="asset-card">
                <div className="asset-card-main">
                  <div className="asset-icon-wrapper">
                    {doc.isPriceList ? <FileSpreadsheet size={18} /> : <FileText size={18} />}
                  </div>
                  <div className="asset-meta">
                    <span className="asset-name" title={doc.name}>{doc.name}</span>
                    <div className="asset-sub-badges">
                      <span className="asset-size">{formatFileSize(doc.size)}</span>
                      {doc.isPriceList ? (
                        <span className="asset-badge price-badge">📊 Tarifario / Precios</span>
                      ) : (
                        <span className="asset-badge doc-badge">📄 Documento</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="asset-card-actions">
                  <button
                    type="button"
                    className="btn-asset-action"
                    onClick={() => setViewingDoc(doc)}
                    title="Ver contenido"
                  >
                    <Eye size={15} />
                  </button>
                  <button
                    type="button"
                    className="btn-asset-action delete"
                    onClick={() => handleRemoveDoc(doc.id)}
                    title="Eliminar archivo"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Document Content Modal / Viewer */}
      {viewingDoc && (
        <div className="doc-preview-card">
          <div className="doc-preview-header">
            <div className="doc-preview-title">
              <FileText size={16} />
              <span>Vista previa de: <strong>{viewingDoc.name}</strong></span>
            </div>
            <button
              type="button"
              className="btn-icon"
              onClick={() => setViewingDoc(null)}
              title="Cerrar vista"
            >
              ✕
            </button>
          </div>
          <pre className="doc-preview-body">{viewingDoc.content}</pre>
        </div>
      )}

      {/* URL Management Section */}
      <div className="urls-manager-section">
        <h4 className="assets-section-title">
          <Globe size={16} /> Enlaces Web / Catálogos Online ({urls.length})
        </h4>

        <div className="url-input-grid">
          <input
            type="text"
            placeholder="URL (ej. https://miempresa.com/planes o catalogo.pdf)"
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
          />
          <input
            type="text"
            placeholder="Título o Descripción (ej. Catálogo de Planes Fibra)"
            value={urlTitleInput}
            onChange={e => setUrlTitleInput(e.target.value)}
          />
          <button
            type="button"
            className="btn-primary"
            onClick={handleAddUrl}
            disabled={!urlInput.trim()}
          >
            <Plus size={16} /> Agregar URL
          </button>
        </div>

        {urls.length > 0 && (
          <div className="urls-list">
            {urls.map(u => (
              <div key={u.id} className="url-item-card">
                <div className="url-item-info">
                  <Globe size={16} className="url-icon" />
                  <div className="url-text-group">
                    <span className="url-title">{u.title || u.url}</span>
                    <a
                      href={u.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="url-link"
                    >
                      {u.url}
                    </a>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-asset-action delete"
                  onClick={() => handleRemoveUrl(u.id)}
                  title="Eliminar URL"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default KnowledgeManager;
