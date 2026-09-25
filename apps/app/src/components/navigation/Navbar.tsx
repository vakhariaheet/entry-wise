import { UserButton } from '@clerk/clerk-react';
import {
  Building2,
  ChevronDown,
  ExternalLink,
  Globe,
  Plus,
  Settings,
  Sparkles,
} from 'lucide-react';
import type React from 'react';
import type { Company, Site } from '@/types';

interface NavbarProps {
  workspaces: Company[];
  currentWorkspace: Company | null;
  onSelectWorkspace: (workspace: Company) => void;
  onOpenCreateWorkspace: () => void;
  sites: Site[];
  currentSite: Site | null;
  onSelectSite: (site: Site) => void;
  onOpenCreateSite: () => void;
  onOpenAiPrompt: () => void;
  onOpenSiteSettings: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  workspaces,
  currentWorkspace,
  onSelectWorkspace,
  onOpenCreateWorkspace,
  sites,
  currentSite,
  onSelectSite,
  onOpenCreateSite,
  onOpenAiPrompt,
  onOpenSiteSettings,
}) => {
  return (
    <header className="border-b border-white/[0.08] bg-[#09090b]/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Left: Brand & Switchers */}
        <div className="flex items-center gap-4 sm:gap-6">
          <a href="https://entrywise.webbound.in" className="flex items-center gap-2.5 group">
            <img
              src="https://entrywise.webbound.in/assets/logo.png"
              alt="Logo"
              className="w-7 h-7 rounded-lg border border-white/[0.1]"
            />
            <span className="font-bold text-sm tracking-tight text-white hidden sm:inline">
              EntryWise
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-white/[0.08] bg-white/[0.03] text-zinc-400">
              0.2.0
            </span>
          </a>

          <div className="h-4 w-[1px] bg-white/[0.1] hidden sm:block"></div>

          {/* Workspace Switcher */}
          <div className="relative group">
            <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05] transition text-xs font-medium text-zinc-200">
              <Building2 className="w-3.5 h-3.5 text-zinc-400" />
              <span className="max-w-[120px] truncate">
                {currentWorkspace ? currentWorkspace.name : 'Workspace'}
              </span>
              <ChevronDown className="w-3 h-3 text-zinc-500" />
            </button>

            <div className="absolute left-0 top-full mt-1.5 w-64 rounded-xl border border-white/[0.1] bg-[#121215] shadow-2xl py-1.5 hidden group-hover:block z-50">
              <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                Workspaces / Companies
              </div>
              <div className="divide-y divide-white/[0.04] max-h-48 overflow-y-auto">
                {workspaces.map((ws) => (
                  <button
                    key={ws.id}
                    onClick={() => onSelectWorkspace(ws)}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-white/[0.04] transition ${
                      currentWorkspace?.id === ws.id
                        ? 'text-emerald-400 font-semibold bg-emerald-500/5'
                        : 'text-zinc-300'
                    }`}
                  >
                    <span className="truncate">{ws.name}</span>
                    {currentWorkspace?.id === ws.id && (
                      <span className="text-[10px] font-mono">Active</span>
                    )}
                  </button>
                ))}
              </div>
              <div className="pt-1.5 mt-1 border-t border-white/[0.06]">
                <button
                  onClick={onOpenCreateWorkspace}
                  className="w-full text-left px-3 py-1.5 text-xs text-zinc-400 hover:text-white flex items-center gap-2 hover:bg-white/[0.04] transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Workspace</span>
                </button>
              </div>
            </div>
          </div>

          {/* Form / Site Switcher */}
          <div className="relative group">
            <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05] transition text-xs font-medium text-zinc-200">
              <Globe className="w-3.5 h-3.5 text-emerald-400" />
              <span className="max-w-[140px] truncate">
                {currentSite
                  ? currentSite.name || currentSite.domain
                  : sites.length > 0
                    ? 'Select Form'
                    : 'No Forms'}
              </span>
              <ChevronDown className="w-3 h-3 text-zinc-500" />
            </button>

            <div className="absolute left-0 top-full mt-1.5 w-64 rounded-xl border border-white/[0.1] bg-[#121215] shadow-2xl py-1.5 hidden group-hover:block z-50">
              <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                Forms in Workspace
              </div>
              <div className="divide-y divide-white/[0.04] max-h-48 overflow-y-auto">
                {sites.map((site) => (
                  <button
                    key={site.id}
                    onClick={() => onSelectSite(site)}
                    className={`w-full text-left px-3 py-2 text-xs flex flex-col hover:bg-white/[0.04] transition ${
                      currentSite?.id === site.id
                        ? 'text-emerald-400 font-semibold bg-emerald-500/5'
                        : 'text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="truncate">{site.name || site.domain}</span>
                      {currentSite?.id === site.id && (
                        <span className="text-[10px] font-mono text-emerald-400">Active</span>
                      )}
                    </div>
                    <span className="text-[10px] text-zinc-500 font-mono truncate">
                      {site.domain}
                    </span>
                  </button>
                ))}
              </div>
              <div className="pt-1.5 mt-1 border-t border-white/[0.06]">
                <button
                  onClick={onOpenCreateSite}
                  className="w-full text-left px-3 py-1.5 text-xs text-zinc-400 hover:text-white flex items-center gap-2 hover:bg-white/[0.04] transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create New Form</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Actions & User */}
        <div className="flex items-center gap-3">
          {currentSite && (
            <button
              onClick={onOpenAiPrompt}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-medium transition shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Copy AI Prompt</span>
            </button>
          )}

          {currentSite && (
            <button
              onClick={onOpenSiteSettings}
              className="p-2 rounded-lg border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.06] text-zinc-300 hover:text-white transition"
              title="Form Settings, Connectors &amp; Templates"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}

          <a
            href="https://entrywise.webbound.in/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:flex items-center gap-1 text-xs text-zinc-400 hover:text-white px-2 py-1.5 transition"
          >
            <span>Docs</span>
            <ExternalLink className="w-3 h-3 text-zinc-500" />
          </a>

          <div className="h-4 w-[1px] bg-white/[0.1]"></div>

          <UserButton
            appearance={{
              elements: {
                userButtonAvatarBox: 'w-8 h-8 rounded-lg border border-white/[0.1]',
              },
            }}
          />
        </div>
      </div>
    </header>
  );
};
