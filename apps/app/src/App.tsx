import React, { useState, useEffect, useCallback } from 'react';
import type { Site, Submission, Company } from './types';
import { api } from './services/api';
import { Navbar } from './components/Navbar';
import { SubmissionsTable } from './components/SubmissionsTable';
import { SubmissionDetailModal } from './components/SubmissionDetailModal';
import { AiPromptModal } from './components/AiPromptModal';
import { SiteSettingsModal } from './components/SiteSettingsModal';
import { CreateSiteModal } from './components/CreateSiteModal';
import { WorkspaceModal } from './components/WorkspaceModal';
import { AuthScreen } from './components/AuthScreen';
import { useAuth } from '@clerk/clerk-react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Plus, Globe, Sparkles, Loader2, AlertCircle, Key } from 'lucide-react';

interface AppProps {
  isClerkConfigured: boolean;
}

export const AppContent: React.FC<AppProps> = () => {
  const { isSignedIn, isLoaded, getToken } = useAuth();

  // Multi-tenant Workspaces state
  const [workspaces, setWorkspaces] = useState<Company[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Company | null>(null);
  const [showCreateWorkspace, setShowCreateWorkspace] = useState<boolean>(false);

  // Forms / Sites state
  const [sites, setSites] = useState<Site[]>([]);
  const [currentSite, setCurrentSite] = useState<Site | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [totalSubmissions, setTotalSubmissions] = useState<number>(0);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isLoadingSites, setIsLoadingSites] = useState<boolean>(true);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Modals
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [showAiPrompt, setShowAiPrompt] = useState<boolean>(false);
  const [showSiteSettings, setShowSiteSettings] = useState<boolean>(false);
  const [showCreateSite, setShowCreateSite] = useState<boolean>(false);

  // 1. Fetch & setup token whenever auth state changes
  useEffect(() => {
    const syncToken = async () => {
      if (isSignedIn) {
        try {
          const token = await getToken();
          api.setAuthToken(token);
        } catch (err) {
          console.error('Failed to get Clerk session token:', err);
        }
      } else {
        api.setAuthToken(null);
      }
    };
    syncToken();
  }, [isSignedIn, getToken]);

  // 2. Fetch Workspaces
  const loadWorkspaces = useCallback(async () => {
    if (!isSignedIn) return;
    try {
      const token = await getToken();
      api.setAuthToken(token);
      const fetchedWorkspaces = await api.listCompanies();
      setWorkspaces(fetchedWorkspaces);
      if (fetchedWorkspaces.length > 0) {
        setCurrentWorkspace((prev) => {
          if (prev && fetchedWorkspaces.some((w) => w.id === prev.id)) {
            return fetchedWorkspaces.find((w) => w.id === prev.id) || fetchedWorkspaces[0];
          }
          return fetchedWorkspaces[0];
        });
      }
    } catch (err: any) {
      console.error('Failed to load workspaces:', err);
    }
  }, [isSignedIn, getToken]);

  useEffect(() => {
    if (isSignedIn) {
      loadWorkspaces();
    }
  }, [isSignedIn, loadWorkspaces]);

  // 3. Fetch Sites for active Workspace
  const loadSites = useCallback(async () => {
    if (!isSignedIn) return;
    setIsLoadingSites(true);
    setApiError(null);
    try {
      const token = await getToken();
      api.setAuthToken(token);
      const fetchedSites = await api.listSites(currentWorkspace?.id);
      setSites(fetchedSites);
      if (fetchedSites.length > 0) {
        setCurrentSite((prev) => {
          if (prev && fetchedSites.some((s) => s.id === prev.id)) {
            return fetchedSites.find((s) => s.id === prev.id) || fetchedSites[0];
          }
          return fetchedSites[0];
        });
      } else {
        setCurrentSite(null);
      }
    } catch (err: any) {
      console.error('Failed to load sites:', err);
      setApiError(err.message || 'Failed to load sites from backend');
    } finally {
      setIsLoadingSites(false);
    }
  }, [isSignedIn, currentWorkspace, getToken]);

  useEffect(() => {
    if (isSignedIn) {
      loadSites();
    }
  }, [isSignedIn, currentWorkspace, loadSites]);

  // 4. Fetch Submissions for the active site
  const loadSubmissions = useCallback(async () => {
    if (!currentSite) {
      setSubmissions([]);
      setTotalSubmissions(0);
      return;
    }

    setIsLoadingSubmissions(true);
    setApiError(null);
    try {
      const token = await getToken();
      api.setAuthToken(token);
      const res = await api.listSubmissions(currentSite.id, {
        status: statusFilter,
      });
      setSubmissions(res.data);
      setTotalSubmissions(res.total);
    } catch (err: any) {
      console.error('Failed to load submissions:', err);
      setApiError(err.message || 'Failed to load submissions from backend');
    } finally {
      setIsLoadingSubmissions(false);
    }
  }, [currentSite, statusFilter, getToken]);

  useEffect(() => {
    if (currentSite) {
      loadSubmissions();
    }
  }, [currentSite, statusFilter, loadSubmissions]);

  // Status updates
  const handleUpdateStatus = async (id: string, status: 'new' | 'read' | 'archived' | 'spam') => {
    if (!currentSite) return;
    try {
      await api.patchSubmissionStatus(currentSite.id, id, status);
      setSubmissions((prev) =>
        prev.map((sub) => (sub.id === id ? { ...sub, status } : sub))
      );
      if (selectedSubmission?.id === id) {
        setSelectedSubmission((prev) => (prev ? { ...prev, status } : null));
      }
    } catch (err: any) {
      console.error('Failed to update status:', err);
      alert(`Error updating status: ${err.message}`);
    }
  };

  // Deletion
  const handleDeleteSubmission = async (id: string) => {
    if (!currentSite) return;
    try {
      await api.deleteSubmission(currentSite.id, id);
      setSubmissions((prev) => prev.filter((sub) => sub.id !== id));
      setTotalSubmissions((prev) => Math.max(0, prev - 1));
      if (selectedSubmission?.id === id) {
        setSelectedSubmission(null);
      }
    } catch (err: any) {
      console.error('Failed to delete submission:', err);
      alert(`Error deleting submission: ${err.message}`);
    }
  };

  const handleExportCsv = () => {
    if (!currentSite) return;
    window.open(api.getExportUrl(currentSite.id), '_blank');
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center text-zinc-400 gap-3">
        <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
        <span className="text-xs font-mono">Initializing EntryWise session...</span>
      </div>
    );
  }

  if (!isSignedIn) {
    return <Navigate to="/sign-in" replace />;
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-[#f4f4f5] flex flex-col">
      <Navbar
        workspaces={workspaces}
        currentWorkspace={currentWorkspace}
        onSelectWorkspace={setCurrentWorkspace}
        onOpenCreateWorkspace={() => setShowCreateWorkspace(true)}
        sites={sites}
        currentSite={currentSite}
        onSelectSite={setCurrentSite}
        onOpenCreateSite={() => setShowCreateSite(true)}
        onOpenAiPrompt={() => setShowAiPrompt(true)}
        onOpenSiteSettings={() => setShowSiteSettings(true)}
      />

      {/* Main Dashboard Canvas */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 space-y-6">
        {/* Error notification if API failed */}
        {apiError && (
          <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-xs text-red-400 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>{apiError}</span>
            </div>
            <button
              onClick={() => { loadSites(); if (currentSite) loadSubmissions(); }}
              className="text-xs underline hover:text-white"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading state for sites */}
        {isLoadingSites ? (
          <div className="py-24 text-center space-y-3">
            <Loader2 className="w-6 h-6 text-emerald-400 animate-spin mx-auto" />
            <div className="text-xs text-zinc-400 font-mono">Fetching your forms from Cloudflare D1...</div>
          </div>
        ) : sites.length === 0 ? (
          /* Empty state when the user has 0 sites registered */
          <div className="py-20 px-6 max-w-lg mx-auto text-center space-y-5 rounded-2xl border border-white/[0.08] bg-[#121215] shadow-2xl mt-8">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.1] flex items-center justify-center mx-auto text-white">
              <Globe className="w-6 h-6 text-emerald-400" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-white tracking-tight">No forms registered in this workspace</h2>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Create your first form to generate an endpoint URL, connect Google Sheets or Slack, customize email templates, and start capturing submissions.
              </p>
            </div>
            <button
              onClick={() => setShowCreateSite(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-black text-xs font-semibold hover:bg-zinc-200 transition shadow-lg shadow-white/5"
            >
              <Plus className="w-4 h-4" />
              <span>Create Your First Form</span>
            </button>
          </div>
        ) : (
          /* Normal Dashboard View with Active Site */
          <>
            {/* Site Header Overview */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <h1 className="text-xl font-bold tracking-tight text-white">
                    {currentSite?.name || currentSite?.domain}
                  </h1>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
                    Live Form
                  </span>
                  {currentSite?.google_sheets_url && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-emerald-500/20 bg-emerald-500/5 text-emerald-300">
                      Sheets
                    </span>
                  )}
                  {currentSite?.slack_webhook_url && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-amber-500/20 bg-amber-500/5 text-amber-300">
                      Slack
                    </span>
                  )}
                  {currentSite?.discord_webhook_url && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-indigo-500/20 bg-indigo-500/5 text-indigo-300">
                      Discord
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-400 font-mono flex items-center gap-2">
                  <span>POST https://entrywise.webbound.in/f/{currentSite?.api_key}</span>
                  <span className="text-zinc-600">|</span>
                  <span className="text-zinc-500">{currentSite?.domain}</span>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowSiteSettings(true)}
                  className="px-3.5 py-1.5 rounded-xl border border-white/[0.08] bg-[#121215] hover:bg-white/[0.05] text-xs font-semibold text-white transition flex items-center gap-1.5"
                >
                  <Key className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Form Settings &amp; Connectors</span>
                </button>

                <button
                  onClick={() => setShowAiPrompt(true)}
                  className="px-3.5 py-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-xs font-semibold text-emerald-400 transition flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Copy AI Prompt</span>
                </button>
              </div>
            </div>

            {/* Submissions Table */}
            <SubmissionsTable
              submissions={submissions}
              total={totalSubmissions}
              currentStatus={statusFilter}
              onStatusChange={setStatusFilter}
              onSelectSubmission={setSelectedSubmission}
              onUpdateStatus={handleUpdateStatus}
              onDeleteSubmission={handleDeleteSubmission}
              onExportCsv={handleExportCsv}
              isLoading={isLoadingSubmissions}
            />
          </>
        )}
      </main>

      {/* Modals */}
      <SubmissionDetailModal
        submission={selectedSubmission}
        onClose={() => setSelectedSubmission(null)}
        onUpdateStatus={handleUpdateStatus}
        onDeleteSubmission={handleDeleteSubmission}
      />

      {showAiPrompt && (
        <AiPromptModal
          site={currentSite}
          onClose={() => setShowAiPrompt(false)}
        />
      )}

      {showSiteSettings && (
        <SiteSettingsModal
          site={currentSite}
          onClose={() => setShowSiteSettings(false)}
          onSiteUpdated={(updated) => {
            setCurrentSite(updated);
            setSites((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
          }}
        />
      )}

      {showCreateSite && (
        <CreateSiteModal
          activeCompanyId={currentWorkspace?.id}
          onClose={() => setShowCreateSite(false)}
          onSiteCreated={(newSite) => {
            setSites((prev) => [newSite, ...prev]);
            setCurrentSite(newSite);
          }}
        />
      )}

      {showCreateWorkspace && (
        <WorkspaceModal
          onClose={() => setShowCreateWorkspace(false)}
          onWorkspaceCreated={(newWorkspace) => {
            setWorkspaces((prev) => [newWorkspace, ...prev]);
            setCurrentWorkspace(newWorkspace);
          }}
        />
      )}
    </div>
  );
};

export default function App({ isClerkConfigured }: AppProps) {
  const { isLoaded, isSignedIn } = useAuth();

  if (isClerkConfigured && !isLoaded) {
    return (
      <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center text-zinc-400 gap-3">
        <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
        <span className="text-xs font-mono">Initializing EntryWise session...</span>
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/sign-in/*"
        element={
          isSignedIn ? (
            <Navigate to="/" replace />
          ) : (
            <AuthScreen mode="sign-in" isClerkConfigured={isClerkConfigured} />
          )
        }
      />
      <Route
        path="/sign-up/*"
        element={
          isSignedIn ? (
            <Navigate to="/" replace />
          ) : (
            <AuthScreen mode="sign-up" isClerkConfigured={isClerkConfigured} />
          )
        }
      />
      <Route
        path="/*"
        element={
          isSignedIn ? (
            <AppContent isClerkConfigured={isClerkConfigured} />
          ) : (
            <Navigate to="/sign-in" replace />
          )
        }
      />
    </Routes>
  );
}
