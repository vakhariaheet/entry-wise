import {
  AlignLeft,
  Check,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Code2,
  Copy,
  Download,
  Eye,
  Globe,
  GripVertical,
  Hash,
  List,
  Loader2,
  Mail,
  Monitor,
  Palette,
  Phone,
  Plus,
  Save,
  Smartphone,
  Sparkles,
  Trash2,
  Type,
  UploadCloud,
} from 'lucide-react';
import type React from 'react';
import { useId, useMemo, useState } from 'react';
import { api } from '@/lib';
import type { FieldType, FormField, Site } from '@/types';

export interface FormTemplateItem {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'email' | 'phone' | 'url' | 'file' | 'textarea' | 'number' | 'select' | 'checkbox';
  placeholder?: string;
  required: boolean;
  options?: string[]; // for select
  helpText?: string;
}

export type TemplateTheme = 'dark' | 'light' | 'emerald' | 'indigo';

interface TemplateStudioViewProps {
  site: Site;
  fields: FormField[];
  onFieldsUpdated: (fields: FormField[]) => void;
}

export const TemplateStudioView: React.FC<TemplateStudioViewProps> = ({
  site,
  fields: initialFields,
  onFieldsUpdated,
}) => {
  const [formTitle, setFormTitle] = useState(site.name || 'Get in Touch');
  const [formDescription, setFormDescription] = useState(
    'Have a question or proposal? Leave your details below and we will get back to you shortly.'
  );
  const [buttonText, setButtonText] = useState('Submit Message');
  const [theme, setTheme] = useState<TemplateTheme>('dark');
  const [borderRadius, setBorderRadius] = useState<'md' | 'lg' | 'xl'>('xl');
  const [showWatermark, setShowWatermark] = useState(true);

  // Active items in the form canvas
  const [items, setItems] = useState<FormTemplateItem[]>(() => {
    if (initialFields.length > 0) {
      return initialFields.map((f, idx) => ({
        id: `field_${idx}_${f.name}`,
        name: f.name,
        label: f.name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        type:
          f.name.toLowerCase() === 'message' || f.name.toLowerCase().includes('body')
            ? 'textarea'
            : (f.type as FormTemplateItem['type']) || 'text',
        placeholder: `Enter your ${f.name.replace(/_/g, ' ')}...`,
        required: true,
      }));
    }
    return [
      {
        id: 'field_name',
        name: 'name',
        label: 'Full Name',
        type: 'text',
        placeholder: 'Alex Taylor',
        required: true,
      },
      {
        id: 'field_email',
        name: 'email',
        label: 'Email Address',
        type: 'email',
        placeholder: 'alex@company.com',
        required: true,
      },
      {
        id: 'field_message',
        name: 'message',
        label: 'Your Message',
        type: 'textarea',
        placeholder: 'Tell us about your project or inquiry...',
        required: true,
      },
    ];
  });

  const [selectedItemId, setSelectedItemId] = useState<string | null>(items[0]?.id || null);
  const [activeView, setActiveView] = useState<'preview' | 'html' | 'embed'>('preview');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const endpointUrl = `https://entrywise.webbound.in/f/${site.api_key}`;

  // Palette of addable field types
  const paletteTypes = [
    { type: 'text' as const, label: 'Text Input', icon: Type },
    { type: 'email' as const, label: 'Email', icon: Mail },
    { type: 'phone' as const, label: 'Phone', icon: Phone },
    { type: 'textarea' as const, label: 'Long Text / Message', icon: AlignLeft },
    { type: 'number' as const, label: 'Number', icon: Hash },
    { type: 'url' as const, label: 'Website URL', icon: Globe },
    { type: 'file' as const, label: 'File Attachment', icon: UploadCloud },
    { type: 'select' as const, label: 'Dropdown Select', icon: List },
    { type: 'checkbox' as const, label: 'Checkbox', icon: CheckSquare },
  ];

  const handleAddField = (type: FormTemplateItem['type']) => {
    const count = items.filter((i) => i.type === type).length + 1;
    const defaultName = type === 'textarea' ? `message_${count}` : `${type}_${count}`;
    const defaultLabel = `${type.charAt(0).toUpperCase() + type.slice(1)} ${count}`;
    const newItem: FormTemplateItem = {
      id: `field_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: defaultName,
      label: defaultLabel,
      type,
      placeholder: `Enter ${defaultLabel.toLowerCase()}...`,
      required: true,
      options: type === 'select' ? ['Option 1', 'Option 2', 'Option 3'] : undefined,
    };
    setItems((prev) => [...prev, newItem]);
    setSelectedItemId(newItem.id);
  };

  const handleRemoveField = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    if (selectedItemId === id) {
      setSelectedItemId(null);
    }
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;
    const newItems = [...items];
    const [moved] = newItems.splice(index, 1);
    newItems.splice(targetIndex, 0, moved);
    setItems(newItems);
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    const newItems = [...items];
    const [moved] = newItems.splice(draggedIndex, 1);
    newItems.splice(index, 0, moved);
    setDraggedIndex(index);
    setItems(newItems);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const selectedItem = useMemo(
    () => items.find((i) => i.id === selectedItemId) || null,
    [items, selectedItemId]
  );

  const updateSelectedItem = (patch: Partial<FormTemplateItem>) => {
    if (!selectedItemId) return;
    setItems((prev) =>
      prev.map((item) => (item.id === selectedItemId ? { ...item, ...patch } : item))
    );
  };

  // Sync back to EntryWise backend schema
  const handleSaveSchema = async () => {
    setIsSaving(true);
    try {
      const fieldPayload: Array<{ name: string; type: FieldType }> = items.map((item) => ({
        name: item.name.trim().toLowerCase().replace(/\s+/g, '_'),
        type: (item.type === 'textarea'
          ? 'text'
          : item.type === 'number'
            ? 'text'
            : item.type === 'select' || item.type === 'checkbox'
              ? 'text'
              : item.type) as FieldType,
      }));

      const res = await api.replaceFields(site.id, fieldPayload);
      onFieldsUpdated(res);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      console.error('Failed to sync form fields:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Theme styling definitions for generated HTML
  const themeStyles = useMemo(() => {
    switch (theme) {
      case 'light':
        return {
          bg: '#f8fafc',
          card: '#ffffff',
          border: '#e2e8f0',
          text: '#0f172a',
          muted: '#64748b',
          inputBg: '#ffffff',
          inputBorder: '#cbd5e1',
          inputText: '#0f172a',
          focusRing: '#10b981',
          btnBg: '#0f172a',
          btnText: '#ffffff',
          btnHover: '#1e293b',
          accent: '#10b981',
        };
      case 'emerald':
        return {
          bg: '#051b14',
          card: '#092d22',
          border: 'rgba(16, 185, 129, 0.25)',
          text: '#f0fdf4',
          muted: '#86efac',
          inputBg: '#041711',
          inputBorder: 'rgba(16, 185, 129, 0.3)',
          inputText: '#f0fdf4',
          focusRing: '#34d399',
          btnBg: '#10b981',
          btnText: '#022c22',
          btnHover: '#059669',
          accent: '#10b981',
        };
      case 'indigo':
        return {
          bg: '#090a16',
          card: '#111327',
          border: 'rgba(99, 102, 241, 0.25)',
          text: '#f8fafc',
          muted: '#a5b4fc',
          inputBg: '#0a0b18',
          inputBorder: 'rgba(99, 102, 241, 0.3)',
          inputText: '#f8fafc',
          focusRing: '#6366f1',
          btnBg: '#6366f1',
          btnText: '#ffffff',
          btnHover: '#4f46e5',
          accent: '#6366f1',
        };
      default:
        return {
          bg: '#09090b',
          card: '#121215',
          border: 'rgba(255, 255, 255, 0.08)',
          text: '#f4f4f5',
          muted: '#a1a1aa',
          inputBg: '#0a0a0d',
          inputBorder: 'rgba(255, 255, 255, 0.1)',
          inputText: '#f4f4f5',
          focusRing: '#10b981',
          btnBg: '#ffffff',
          btnText: '#09090b',
          btnHover: '#e4e4e7',
          accent: '#10b981',
        };
    }
  }, [theme]);

  const hasFileInput = items.some((i) => i.type === 'file');

  // Full HTML Page Generator
  const fullHtmlCode = useMemo(() => {
    const renderedInputs = items
      .map((item) => {
        const requiredAttr = item.required ? 'required' : '';
        const requiredBadge = item.required ? ' <span class="required">*</span>' : '';

        if (item.type === 'textarea') {
          return `        <div class="form-group">
          <label for="${item.name}">${item.label}${requiredBadge}</label>
          <textarea id="${item.name}" name="${item.name}" rows="4" placeholder="${item.placeholder || ''}" ${requiredAttr}></textarea>
          ${item.helpText ? `<small class="help-text">${item.helpText}</small>` : ''}
        </div>`;
        }

        if (item.type === 'select') {
          const optionsHtml = (item.options || ['Option 1', 'Option 2'])
            .map((opt) => `            <option value="${opt}">${opt}</option>`)
            .join('\n');
          return `        <div class="form-group">
          <label for="${item.name}">${item.label}${requiredBadge}</label>
          <select id="${item.name}" name="${item.name}" ${requiredAttr}>
            <option value="" disabled selected>Select an option...</option>
${optionsHtml}
          </select>
          ${item.helpText ? `<small class="help-text">${item.helpText}</small>` : ''}
        </div>`;
        }

        if (item.type === 'checkbox') {
          return `        <div class="form-group checkbox-group">
          <input type="checkbox" id="${item.name}" name="${item.name}" value="yes" ${requiredAttr} />
          <label for="${item.name}">${item.label}${requiredBadge}</label>
          ${item.helpText ? `<small class="help-text">${item.helpText}</small>` : ''}
        </div>`;
        }

        const inputType =
          item.type === 'phone' ? 'tel' : item.type === 'number' ? 'number' : item.type;

        return `        <div class="form-group">
          <label for="${item.name}">${item.label}${requiredBadge}</label>
          <input type="${inputType}" id="${item.name}" name="${item.name}" placeholder="${item.placeholder || ''}" ${requiredAttr} />
          ${item.helpText ? `<small class="help-text">${item.helpText}</small>` : ''}
        </div>`;
      })
      .join('\n\n');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${formTitle} — ${site.domain}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: ${themeStyles.bg};
      --card-bg: ${themeStyles.card};
      --border-color: ${themeStyles.border};
      --text: ${themeStyles.text};
      --muted: ${themeStyles.muted};
      --input-bg: ${themeStyles.inputBg};
      --input-border: ${themeStyles.inputBorder};
      --input-text: ${themeStyles.inputText};
      --focus-ring: ${themeStyles.focusRing};
      --btn-bg: ${themeStyles.btnBg};
      --btn-text: ${themeStyles.btnText};
      --btn-hover: ${themeStyles.btnHover};
      --accent: ${themeStyles.accent};
      --radius: ${borderRadius === 'md' ? '8px' : borderRadius === 'lg' ? '12px' : '16px'};
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      background-color: var(--bg);
      color: var(--text);
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 32px 16px;
      -webkit-font-smoothing: antialiased;
    }

    .form-card {
      width: 100%;
      max-width: 520px;
      background-color: var(--card-bg);
      border: 1px solid var(--border-color);
      border-radius: var(--radius);
      padding: 36px 32px;
      box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.4);
      position: relative;
    }

    .form-header {
      margin-bottom: 28px;
    }

    .form-title {
      font-size: 24px;
      font-weight: 700;
      letter-spacing: -0.02em;
      margin-bottom: 8px;
      color: var(--text);
    }

    .form-description {
      font-size: 14px;
      color: var(--muted);
      line-height: 1.5;
    }

    .form-group {
      margin-bottom: 20px;
      display: flex;
      flex-direction: column;
    }

    .form-group label {
      font-size: 13px;
      font-weight: 600;
      color: var(--text);
      margin-bottom: 6px;
    }

    .required {
      color: #ef4444;
      margin-left: 2px;
    }

    .help-text {
      font-size: 11px;
      color: var(--muted);
      margin-top: 4px;
    }

    .form-group input[type="text"],
    .form-group input[type="email"],
    .form-group input[type="tel"],
    .form-group input[type="number"],
    .form-group input[type="url"],
    .form-group select,
    .form-group textarea {
      width: 100%;
      background-color: var(--input-bg);
      border: 1px solid var(--input-border);
      border-radius: calc(var(--radius) - 4px);
      padding: 11px 14px;
      font-size: 14px;
      color: var(--input-text);
      font-family: inherit;
      outline: none;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }

    .form-group input[type="file"] {
      font-size: 13px;
      color: var(--muted);
      padding: 6px 0;
    }

    .checkbox-group {
      flex-direction: row;
      align-items: center;
      gap: 10px;
    }

    .checkbox-group label {
      margin-bottom: 0;
      font-weight: 500;
      cursor: pointer;
    }

    .form-group input:focus,
    .form-group select:focus,
    .form-group textarea:focus {
      border-color: var(--focus-ring);
      box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.18);
    }

    .submit-button {
      width: 100%;
      background-color: var(--btn-bg);
      color: var(--btn-text);
      font-size: 14px;
      font-weight: 600;
      padding: 13px 20px;
      border: none;
      border-radius: calc(var(--radius) - 4px);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin-top: 8px;
      transition: background-color 0.15s ease, transform 0.05s ease;
    }

    .submit-button:hover {
      background-color: var(--btn-hover);
    }

    .submit-button:active {
      transform: scale(0.99);
    }

    .submit-button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .spinner {
      display: inline-block;
      width: 16px;
      height: 16px;
      border: 2px solid rgba(0, 0, 0, 0.2);
      border-top-color: currentColor;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .error-banner {
      background-color: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #fca5a5;
      font-size: 13px;
      padding: 12px 14px;
      border-radius: calc(var(--radius) - 4px);
      margin-bottom: 20px;
      display: none;
    }

    .success-card {
      text-align: center;
      padding: 24px 8px;
      display: none;
    }

    .success-icon {
      width: 48px;
      height: 48px;
      background-color: rgba(16, 185, 129, 0.15);
      color: #10b981;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      margin: 0 auto 16px auto;
      border: 1px solid rgba(16, 185, 129, 0.3);
    }

    .success-card h3 {
      font-size: 20px;
      font-weight: 700;
      margin-bottom: 8px;
      color: var(--text);
    }

    .success-card p {
      font-size: 14px;
      color: var(--muted);
      line-height: 1.5;
      margin-bottom: 24px;
    }

    .reset-btn {
      background: transparent;
      border: 1px solid var(--border-color);
      color: var(--text);
      padding: 8px 16px;
      border-radius: calc(var(--radius) - 4px);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }

    .reset-btn:hover {
      background-color: rgba(255, 255, 255, 0.05);
    }

    .watermark {
      margin-top: 24px;
      text-align: center;
      font-size: 11px;
      color: var(--muted);
      letter-spacing: 0.02em;
    }

    .watermark a {
      color: var(--muted);
      text-decoration: none;
      font-weight: 600;
    }

    .watermark a:hover {
      color: var(--text);
    }
  </style>
</head>
<body>

  <div class="form-card">
    <div id="form-content">
      <div class="form-header">
        <h1 class="form-title">${formTitle}</h1>
        <p class="form-description">${formDescription}</p>
      </div>

      <div id="error-alert" class="error-banner"></div>

      <form id="entrywise-form" action="${endpointUrl}" method="POST"${hasFileInput ? ' enctype="multipart/form-data"' : ''}>
        <!-- Anti-spam Honeypot (Kept hidden from human users) -->
        <input type="text" name="_gotcha" style="display:none !important" tabindex="-1" autocomplete="off" />

${renderedInputs}

        <button type="submit" id="submit-btn" class="submit-button">
          <span id="btn-text">${buttonText}</span>
          <span id="btn-spinner" style="display:none;" class="spinner"></span>
        </button>
      </form>
    </div>

    <!-- Success Screen (Replaces Form After Submission) -->
    <div id="success-screen" class="success-card">
      <div class="success-icon">✓</div>
      <h3>Thank You!</h3>
      <p>Your message has been received successfully. Our team will get back to you shortly.</p>
      <button type="button" class="reset-btn" onclick="resetForm()">Send Another Submission</button>
    </div>

${
  showWatermark
    ? `    <div class="watermark">
      Powered securely by <a href="https://entrywise.webbound.in" target="_blank" rel="noopener">EntryWise</a>
    </div>`
    : ''
}
  </div>

  <script>
    const form = document.getElementById('entrywise-form');
    const formContent = document.getElementById('form-content');
    const successScreen = document.getElementById('success-screen');
    const submitBtn = document.getElementById('submit-btn');
    const btnText = document.getElementById('btn-text');
    const btnSpinner = document.getElementById('btn-spinner');
    const errorAlert = document.getElementById('error-alert');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorAlert.style.display = 'none';
      submitBtn.disabled = true;
      btnText.style.display = 'none';
      btnSpinner.style.display = 'inline-block';

      try {
        const formData = new FormData(form);
        const res = await fetch(form.action, {
          method: 'POST',
          body: formData,
          headers: { 'Accept': 'application/json' }
        });

        if (res.ok) {
          formContent.style.display = 'none';
          successScreen.style.display = 'block';
        } else {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || errData.message || 'Submission failed. Please check your entries.');
        }
      } catch (err) {
        errorAlert.textContent = err.message || 'An error occurred while submitting. Please try again.';
        errorAlert.style.display = 'block';
        submitBtn.disabled = false;
        btnText.style.display = 'inline';
        btnSpinner.style.display = 'none';
      }
    });

    function resetForm() {
      form.reset();
      formContent.style.display = 'block';
      successScreen.style.display = 'none';
      submitBtn.disabled = false;
      btnText.style.display = 'inline';
      btnSpinner.style.display = 'none';
    }
  </script>
</body>
</html>`;
  }, [
    items,
    formTitle,
    formDescription,
    buttonText,
    themeStyles,
    borderRadius,
    showWatermark,
    endpointUrl,
    hasFileInput,
    site.domain,
  ]);

  const handleCopyHtml = () => {
    navigator.clipboard.writeText(fullHtmlCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleDownloadHtml = () => {
    const blob = new Blob([fullHtmlCode], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${site.domain.replace(/[^a-zA-Z0-9]/g, '_')}_form.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Generate unique form control IDs for accessibility
  const titleInputId = useId();
  const descInputId = useId();
  const btnInputId = useId();
  const fieldLabelId = useId();
  const fieldVarId = useId();
  const fieldPlaceholderId = useId();
  const fieldHelpId = useId();

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Studio Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-400" />
            <span>Form Template Studio</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Drag-and-drop form elements, customize themes, and export a complete production-grade
            HTML5 web form.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleSaveSchema}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] text-xs font-semibold text-zinc-200 transition"
          >
            {isSaving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5 text-emerald-400" />
            )}
            <span>{saveSuccess ? 'Synced to Schema!' : 'Sync Schema'}</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadHtml}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-semibold transition shadow-lg shadow-emerald-500/20"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download HTML</span>
          </button>
        </div>
      </div>

      {/* Main Studio Grid: Left Palette | Center Canvas | Right Preview / Code */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Column 1: Palette & Settings (3 Cols) */}
        <div className="lg:col-span-3 space-y-5">
          {/* Elements Palette */}
          <div className="p-4 rounded-2xl border border-white/[0.08] bg-[#121318] space-y-3">
            <div className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
              <span>Add Form Elements</span>
            </div>
            <p className="text-[11px] text-zinc-400">
              Click to add any element to your form canvas:
            </p>

            <div className="grid grid-cols-1 gap-1.5">
              {paletteTypes.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => handleAddField(item.type)}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-white/[0.06] bg-[#0c0d10] hover:bg-white/[0.05] hover:border-emerald-500/30 text-left text-xs font-medium text-zinc-300 transition group"
                  >
                    <span className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-zinc-400 group-hover:text-emerald-400 transition" />
                      <span>{item.label}</span>
                    </span>
                    <Plus className="w-3.5 h-3.5 text-zinc-500 group-hover:text-emerald-400 transition" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Theme & Styling */}
          <div className="p-4 rounded-2xl border border-white/[0.08] bg-[#121318] space-y-3">
            <div className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-emerald-400" />
              <span>Form Style &amp; Theme</span>
            </div>

            <div className="space-y-3">
              <div>
                <span className="block text-[11px] text-zinc-400 mb-1.5 font-medium">
                  Color Preset
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  {(
                    [
                      { id: 'dark', label: 'Dark Obsidian' },
                      { id: 'light', label: 'Minimal Light' },
                      { id: 'emerald', label: 'Emerald Glow' },
                      { id: 'indigo', label: 'Indigo Slate' },
                    ] as const
                  ).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTheme(t.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border text-center transition ${
                        theme === t.id
                          ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                          : 'border-white/[0.06] bg-[#0c0d10] text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="block text-[11px] text-zinc-400 mb-1.5 font-medium">
                  Corner Radius
                </span>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['md', 'lg', 'xl'] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setBorderRadius(r)}
                      className={`px-2 py-1 rounded-lg text-xs font-medium border text-center transition ${
                        borderRadius === r
                          ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                          : 'border-white/[0.06] bg-[#0c0d10] text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {r.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-zinc-300">EntryWise Watermark</span>
                <input
                  type="checkbox"
                  checked={showWatermark}
                  onChange={(e) => setShowWatermark(e.target.checked)}
                  className="rounded border-zinc-700 bg-zinc-800 text-emerald-500 focus:ring-0"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Column 2: Drag-and-Drop Canvas (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="p-4 rounded-2xl border border-white/[0.08] bg-[#121318] space-y-4 shadow-lg">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
              <span className="text-xs font-semibold text-white uppercase tracking-wider">
                Form Canvas ({items.length} fields)
              </span>
              <span className="text-[11px] text-zinc-500 font-mono">Drag handle to reorder</span>
            </div>

            {/* Form Title & Description Settings */}
            <div className="p-3 rounded-xl border border-white/[0.06] bg-[#0a0a0d] space-y-2">
              <label
                htmlFor={titleInputId}
                className="block text-[11px] font-semibold text-zinc-300"
              >
                Form Title
              </label>
              <input
                id={titleInputId}
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                className="w-full bg-[#121318] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500/50"
              />
              <label
                htmlFor={descInputId}
                className="block text-[11px] font-semibold text-zinc-300 mt-2"
              >
                Subtitle Description
              </label>
              <input
                id={descInputId}
                type="text"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                className="w-full bg-[#121318] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500/50"
              />
              <label
                htmlFor={btnInputId}
                className="block text-[11px] font-semibold text-zinc-300 mt-2"
              >
                Submit Button Label
              </label>
              <input
                id={btnInputId}
                type="text"
                value={buttonText}
                onChange={(e) => setButtonText(e.target.value)}
                className="w-full bg-[#121318] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500/50"
              />
            </div>

            {/* Draggable Form Fields List */}
            <ul className="space-y-2 max-h-[460px] overflow-y-auto pr-1 list-none p-0 m-0">
              {items.map((item, index) => {
                const isSelected = item.id === selectedItemId;
                return (
                  <li
                    key={item.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`p-3 rounded-xl border text-left transition flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'border-emerald-500/60 bg-emerald-500/[0.08] shadow-md shadow-emerald-500/5'
                        : 'border-white/[0.06] bg-[#0c0d10] hover:bg-white/[0.04]'
                    } ${draggedIndex === index ? 'opacity-40 border-dashed border-emerald-400' : ''}`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedItemId(item.id)}
                      className="flex items-center gap-2 min-w-0 flex-1 text-left focus:outline-none"
                    >
                      <div className="cursor-grab text-zinc-500 hover:text-zinc-300 p-0.5">
                        <GripVertical className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-zinc-200 truncate flex items-center gap-1.5">
                          <span>{item.label}</span>
                          {item.required && (
                            <span className="text-[10px] text-emerald-400 font-normal">Req</span>
                          )}
                        </div>
                        <div className="text-[10px] font-mono text-zinc-400 truncate">
                          name="{item.name}" &bull; {item.type}
                        </div>
                      </div>
                    </button>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMove(index, 'up');
                        }}
                        disabled={index === 0}
                        className="p-1 rounded text-zinc-400 hover:text-white disabled:opacity-20"
                        title="Move Up"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMove(index, 'down');
                        }}
                        disabled={index === items.length - 1}
                        className="p-1 rounded text-zinc-400 hover:text-white disabled:opacity-20"
                        title="Move Down"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveField(item.id);
                        }}
                        className="p-1 rounded text-zinc-500 hover:text-red-400 transition"
                        title="Delete Field"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>

            {/* Selected Element Property Inspector */}
            {selectedItem && (
              <div className="p-4 rounded-xl border border-white/[0.08] bg-[#0c0d10] space-y-3 pt-3">
                <div className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">
                  Edit Element: {selectedItem.label}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label htmlFor={fieldLabelId} className="block text-[10px] text-zinc-400 mb-1">
                      Label Text
                    </label>
                    <input
                      id={fieldLabelId}
                      type="text"
                      value={selectedItem.label}
                      onChange={(e) => updateSelectedItem({ label: e.target.value })}
                      className="w-full bg-[#121318] border border-white/[0.08] rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label htmlFor={fieldVarId} className="block text-[10px] text-zinc-400 mb-1">
                      Variable Key (name)
                    </label>
                    <input
                      id={fieldVarId}
                      type="text"
                      value={selectedItem.name}
                      onChange={(e) =>
                        updateSelectedItem({
                          name: e.target.value.toLowerCase().replace(/\s+/g, '_'),
                        })
                      }
                      className="w-full bg-[#121318] border border-white/[0.08] rounded-lg px-2.5 py-1 text-xs text-white font-mono focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor={fieldPlaceholderId}
                    className="block text-[10px] text-zinc-400 mb-1"
                  >
                    Placeholder
                  </label>
                  <input
                    id={fieldPlaceholderId}
                    type="text"
                    value={selectedItem.placeholder || ''}
                    onChange={(e) => updateSelectedItem({ placeholder: e.target.value })}
                    className="w-full bg-[#121318] border border-white/[0.08] rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor={fieldHelpId} className="block text-[10px] text-zinc-400 mb-1">
                    Help Text (optional)
                  </label>
                  <input
                    id={fieldHelpId}
                    type="text"
                    value={selectedItem.helpText || ''}
                    onChange={(e) => updateSelectedItem({ helpText: e.target.value })}
                    className="w-full bg-[#121318] border border-white/[0.08] rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="field-required-toggle"
                    checked={selectedItem.required}
                    onChange={(e) => updateSelectedItem({ required: e.target.checked })}
                    className="rounded border-zinc-700 bg-zinc-800 text-emerald-500 focus:ring-0"
                  />
                  <label
                    htmlFor="field-required-toggle"
                    className="text-xs text-zinc-300 font-medium cursor-pointer"
                  >
                    Required Field
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Column 3: Live Preview & Generated Full HTML (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-4 rounded-2xl border border-white/[0.08] bg-[#121318] space-y-4 shadow-lg">
            {/* View Switcher Bar */}
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-1 bg-[#0a0a0d] p-1 rounded-xl border border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setActiveView('preview')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    activeView === 'preview'
                      ? 'bg-white/[0.1] text-white shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Live Preview</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveView('html')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    activeView === 'html'
                      ? 'bg-white/[0.1] text-white shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>Full HTML</span>
                </button>
              </div>

              {activeView === 'preview' ? (
                <div className="flex items-center gap-1 bg-[#0a0a0d] p-1 rounded-xl border border-white/[0.08]">
                  <button
                    type="button"
                    onClick={() => setPreviewDevice('desktop')}
                    className={`p-1.5 rounded-lg transition ${
                      previewDevice === 'desktop'
                        ? 'bg-white/[0.1] text-white'
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                    title="Desktop Preview"
                  >
                    <Monitor className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewDevice('mobile')}
                    className={`p-1.5 rounded-lg transition ${
                      previewDevice === 'mobile'
                        ? 'bg-white/[0.1] text-white'
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                    title="Mobile View"
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleCopyHtml}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.14] text-white text-xs font-medium transition"
                >
                  {copiedCode ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedCode ? 'Copied HTML!' : 'Copy Code'}</span>
                </button>
              )}
            </div>

            {/* Display Area: Live Interactive Preview vs Code Viewer */}
            {activeView === 'preview' ? (
              <div
                className={`mx-auto rounded-2xl border transition-all duration-300 overflow-hidden shadow-2xl ${
                  previewDevice === 'mobile' ? 'max-w-[320px]' : 'w-full'
                }`}
                style={{
                  backgroundColor: themeStyles.card,
                  borderColor: themeStyles.border,
                  padding: '24px 20px',
                }}
              >
                <div className="mb-5">
                  <h3
                    className="text-base font-bold tracking-tight"
                    style={{ color: themeStyles.text }}
                  >
                    {formTitle}
                  </h3>
                  <p className="text-xs mt-1 leading-relaxed" style={{ color: themeStyles.muted }}>
                    {formDescription}
                  </p>
                </div>

                <div className="space-y-3.5">
                  {items.map((item) => (
                    <div key={item.id} className="space-y-1">
                      {item.type === 'checkbox' ? (
                        <label
                          htmlFor={`preview-field-${item.id}`}
                          className="flex items-center gap-2 pt-1 cursor-pointer"
                        >
                          <input
                            id={`preview-field-${item.id}`}
                            type="checkbox"
                            className="rounded"
                          />
                          <span
                            className="text-xs font-semibold"
                            style={{ color: themeStyles.text }}
                          >
                            {item.label}
                            {item.required && <span className="text-red-400 ml-0.5">*</span>}
                          </span>
                        </label>
                      ) : (
                        <>
                          <label
                            htmlFor={`preview-field-${item.id}`}
                            className="block text-xs font-semibold"
                            style={{ color: themeStyles.text }}
                          >
                            {item.label}
                            {item.required && <span className="text-red-400 ml-0.5">*</span>}
                          </label>

                          {item.type === 'textarea' ? (
                            <textarea
                              id={`preview-field-${item.id}`}
                              rows={3}
                              placeholder={item.placeholder}
                              className="w-full text-xs rounded-lg px-3 py-2 outline-none transition"
                              style={{
                                backgroundColor: themeStyles.inputBg,
                                borderColor: themeStyles.inputBorder,
                                color: themeStyles.inputText,
                                borderWidth: '1px',
                              }}
                            />
                          ) : item.type === 'select' ? (
                            <select
                              id={`preview-field-${item.id}`}
                              className="w-full text-xs rounded-lg px-3 py-2 outline-none transition"
                              style={{
                                backgroundColor: themeStyles.inputBg,
                                borderColor: themeStyles.inputBorder,
                                color: themeStyles.inputText,
                                borderWidth: '1px',
                              }}
                            >
                              {(item.options || ['Option 1', 'Option 2']).map((opt) => (
                                <option key={opt}>{opt}</option>
                              ))}
                            </select>
                          ) : (
                            <input
                              id={`preview-field-${item.id}`}
                              type={item.type === 'phone' ? 'tel' : item.type}
                              placeholder={item.placeholder}
                              className="w-full text-xs rounded-lg px-3 py-2 outline-none transition"
                              style={{
                                backgroundColor: themeStyles.inputBg,
                                borderColor: themeStyles.inputBorder,
                                color: themeStyles.inputText,
                                borderWidth: '1px',
                              }}
                            />
                          )}
                        </>
                      )}

                      {item.helpText && (
                        <span className="block text-[10px]" style={{ color: themeStyles.muted }}>
                          {item.helpText}
                        </span>
                      )}
                    </div>
                  ))}

                  <button
                    type="button"
                    className="w-full font-semibold text-xs py-2.5 rounded-lg shadow-sm mt-2 transition"
                    style={{
                      backgroundColor: themeStyles.btnBg,
                      color: themeStyles.btnText,
                    }}
                  >
                    {buttonText}
                  </button>

                  {showWatermark && (
                    <div
                      className="pt-2 text-center text-[10px]"
                      style={{ color: themeStyles.muted }}
                    >
                      Powered by EntryWise
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-white/[0.08] bg-[#070709] overflow-hidden shadow-2xl">
                <div className="px-4 py-2.5 border-b border-white/[0.06] bg-[#0b0c0f] flex items-center justify-between">
                  <span className="font-mono text-xs text-zinc-400">
                    index.html (Full Standalone Document)
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyHtml}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1"
                  >
                    {copiedCode ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{copiedCode ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>
                <pre className="p-4 text-xs font-mono text-zinc-200 overflow-x-auto max-h-[440px] leading-relaxed">
                  {fullHtmlCode}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
