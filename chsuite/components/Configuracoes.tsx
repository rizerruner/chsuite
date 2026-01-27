
import React, { useState, useRef, useEffect } from 'react';
import { CURRENT_USER, PAYMENT_METHODS as INITIAL_PAYMENT_METHODS } from '../constants';
import SecuritySettings from './SecuritySettings';
import { useRBAC } from '../context/RBACContext';
import { useAuth } from '../context/AuthContext';

type Tab = 'perfil' | 'preferencias' | 'organizacao' | 'seguranca';

const Configuracoes: React.FC = () => {
  const { currentUser, updateUserProfile, hasPermission, currentRole } = useRBAC();
  const { resetPassword } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('perfil');
  const [isDarkMode, setIsDarkMode] = useState(currentUser.darkMode);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile State
  const [profile, setProfile] = useState({
    name: currentUser.name,
    email: currentUser.email,
    position: currentUser.position,
    department: currentUser.department,
    avatar: currentUser.avatar
  });

  // Sync state with currentUser when it changes
  useEffect(() => {
    setProfile({
      name: currentUser.name,
      email: currentUser.email,
      position: currentUser.position,
      department: currentUser.department,
      avatar: currentUser.avatar
    });
    setIsDarkMode(currentUser.darkMode);
  }, [currentUser]);

  // Org State
  const { companySettings, updateCompanySettings } = useRBAC();
  const [localOrg, setLocalOrg] = useState(companySettings);

  // Sync local org when context changes (initial load)
  useEffect(() => {
    setLocalOrg(companySettings);
  }, [companySettings]);

  const handleToggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (readerEvent) => {
        const image = new Image();
        image.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 300;
          let width = image.width;
          let height = image.height;

          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(image, 0, 0, width, height);

          // Compress to JPEG with 0.7 quality to save space
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          setProfile(prev => ({ ...prev, avatar: dataUrl }));
        };
        image.src = readerEvent.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (readerEvent) => {
        setLocalOrg(prev => ({ ...prev, logo: readerEvent.target?.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleResetPassword = async () => {
    try {
      await resetPassword(profile.email);
      setResetSent(true);
      setTimeout(() => setResetSent(false), 5000);
    } catch (error) {
      console.error("Error sending reset email:", error);
      alert("Erro ao enviar email de redefinição. Verifique se o email é válido.");
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    setShowSuccess(false);

    try {
      // Save Profile
      await updateUserProfile({
        name: profile.name,
        email: profile.email,
        position: profile.position,
        department: profile.department,
        avatar: profile.avatar,
        darkMode: isDarkMode
      });

      // Save Company Settings
      await updateCompanySettings(localOrg);

      setTimeout(() => {
        setIsSaving(false);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
      }, 500);
    } catch (error: any) {
      console.error("Error updating settings:", error);
      setIsSaving(false);
      setSaveError(error.message || "Erro ao salvar alterações.");
    }
  };

  // Tab Permissions Mapping
  const ALL_TABS = [
    { id: 'perfil', label: 'Meu Perfil', icon: 'person' },
    { id: 'preferencias', label: 'Preferências', icon: 'tune' },
    { id: 'organizacao', label: 'Organização', icon: 'business' },
    { id: 'seguranca', label: 'Segurança', icon: 'shield', permission: { module: 'seguranca', action: 'view' } },
  ];

  const availableTabs = ALL_TABS.filter(tab =>
    !tab.permission || hasPermission(tab.permission.module as any, tab.permission.action as any)
  );

  // Security check: if current activeTab is not in availableTabs, fallback to perfil
  useEffect(() => {
    if (!availableTabs.find(t => t.id === activeTab)) {
      setActiveTab('perfil');
    }
  }, [availableTabs, activeTab]);

  return (
    <div className="flex flex-col gap-6 p-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-black tracking-tight dark:text-white">Configurações</h1>
        <p className="text-[#636f88] dark:text-gray-400 text-base font-normal">Personalize sua experiência e gerencie os parâmetros globais da plataforma.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Navigation Tabs */}
        <div className="lg:w-64 flex flex-col gap-1">
          {availableTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-bold ${activeTab === tab.id
                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
            >
              <span className="material-symbols-outlined text-[20px]">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1">
          <div className="bg-white dark:bg-[#1c222d] rounded-2xl border border-[#dcdfe5] dark:border-[#2d333d] shadow-sm p-8 min-h-[500px]">

            {/* Tab: PERFIL */}
            {activeTab === 'perfil' && (
              <div className="animate-in fade-in slide-in-from-right-2 duration-300">
                <h3 className="text-xl font-bold dark:text-white mb-8">Informações Pessoais</h3>

                <div className="flex flex-col md:flex-row gap-12">
                  <div className="flex flex-col items-center gap-4">
                    <div className="relative group">
                      {profile.avatar ? (
                        <img
                          src={profile.avatar}
                          className="size-32 rounded-full border-4 border-slate-50 dark:border-slate-800 object-cover shadow-xl"
                          alt=""
                        />
                      ) : (
                        <div className="size-32 rounded-full border-4 border-slate-50 dark:border-slate-800 shadow-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                          <span className="text-4xl font-black text-slate-400 uppercase">{profile.name?.charAt(0) || 'U'}</span>
                        </div>
                      )}
                      <div className="absolute bottom-0 right-0 flex gap-2">
                        {profile.avatar && (
                          <button
                            type="button"
                            onClick={() => setProfile(prev => ({ ...prev, avatar: '' }))}
                            className="size-10 bg-red-500 text-white rounded-full flex items-center justify-center border-4 border-white dark:border-[#1c222d] shadow-lg hover:bg-red-600 hover:scale-110 transition-transform"
                            title="Remover foto"
                          >
                            <span className="material-symbols-outlined text-[20px]">delete</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="size-10 bg-primary text-white rounded-full flex items-center justify-center border-4 border-white dark:border-[#1c222d] shadow-lg hover:scale-110 transition-transform"
                          title="Carregar foto"
                        >
                          <span className="material-symbols-outlined text-[20px]">photo_camera</span>
                        </button>
                      </div>
                      <input type="file" ref={fileInputRef} onChange={handleAvatarUpload} className="hidden" accept="image/*" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold dark:text-white">{profile.name}</p>
                      <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{currentRole?.name || profile.position}</p>
                    </div>
                  </div>

                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-black uppercase text-slate-400 tracking-widest">Nome Completo</label>
                      <input
                        value={profile.name}
                        onChange={e => setProfile({ ...profile, name: e.target.value })}
                        className="rounded-lg border-[#dcdfe5] dark:border-[#2d333d] dark:bg-[#111621] text-sm dark:text-white"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-black uppercase text-slate-400 tracking-widest">E-mail</label>
                      <input
                        value={profile.email}
                        onChange={e => setProfile({ ...profile, email: e.target.value })}
                        className="rounded-lg border-[#dcdfe5] dark:border-[#2d333d] dark:bg-[#111621] text-sm dark:text-white"
                      />
                      <div className="flex items-center justify-between pt-1">
                        <button
                          onClick={handleResetPassword}
                          type="button"
                          className="text-[11px] font-bold text-primary hover:text-primary/80 hover:underline flex items-center gap-1 transition-all"
                        >
                          <span className="material-symbols-outlined text-[12px]">lock_reset</span>
                          Redefinir Senha
                        </button>
                        {resetSent && (
                          <span className="text-[10px] text-green-600 font-bold animate-in fade-in">
                            Email enviado!
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-black uppercase text-slate-400 tracking-widest">Perfil</label>
                      <div className="rounded-lg border border-[#dcdfe5] dark:border-[#2d333d] bg-slate-50 dark:bg-[#111621] px-3 py-2 text-sm font-bold text-slate-700 dark:text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px] text-primary">verified_user</span>
                        {currentRole?.name || profile.position}
                      </div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-1">Este campo é definido pela administração</p>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-black uppercase text-slate-400 tracking-widest">Departamento</label>
                      <input
                        value={profile.department}
                        onChange={e => setProfile({ ...profile, department: e.target.value })}
                        className="rounded-lg border-[#dcdfe5] dark:border-[#2d333d] dark:bg-[#111621] text-sm dark:text-white"
                        placeholder="Ex: Geral, TI, Vendas..."
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: ORGANIZACAO */}
            {activeTab === 'organizacao' && (
              <div className="animate-in fade-in slide-in-from-right-2 duration-300 space-y-12">
                <div className="space-y-6">
                  <h3 className="text-xl font-bold dark:text-white">Dados da Empresa</h3>
                  <p className="text-xs text-slate-500 -mt-4">Estas informações serão exibidas nos relatórios e comprovantes gerados pelo sistema.</p>

                  <div className="flex flex-col md:flex-row gap-12 pt-4">
                    <div className="flex flex-col items-center gap-4">
                      <div className="relative group">
                        {localOrg.logo ? (
                          <img
                            src={localOrg.logo}
                            className="size-32 rounded-2xl border-2 border-slate-100 dark:border-slate-800 object-contain p-2 bg-white"
                            alt="Logo Empresa"
                          />
                        ) : (
                          <div className="size-32 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center gap-2 text-slate-400">
                            <span className="material-symbols-outlined text-3xl">image</span>
                            <span className="text-[10px] font-black uppercase">Logo</span>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = 'image/*';
                            input.onchange = (e: any) => handleLogoUpload(e);
                            input.click();
                          }}
                          className="absolute -bottom-2 -right-2 size-10 bg-primary text-white rounded-xl shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
                        >
                          <span className="material-symbols-outlined text-[20px]">add_photo_alternate</span>
                        </button>
                      </div>
                    </div>

                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-black uppercase text-slate-400 tracking-widest pl-1">Razão Social</label>
                        <input
                          value={localOrg.companyName}
                          onChange={e => setLocalOrg({ ...localOrg, companyName: e.target.value })}
                          className="rounded-xl border-[#dcdfe5] dark:border-[#2d333d] dark:bg-[#111621] text-sm dark:text-white h-11 px-4 shadow-sm"
                          placeholder="Nome oficial da empresa"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-black uppercase text-slate-400 tracking-widest pl-1">CNPJ</label>
                        <input
                          value={localOrg.cnpj}
                          onChange={e => setLocalOrg({ ...localOrg, cnpj: e.target.value })}
                          className="rounded-xl border-[#dcdfe5] dark:border-[#2d333d] dark:bg-[#111621] text-sm dark:text-white h-11 px-4 shadow-sm"
                          placeholder="00.000.000/0000-00"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5 md:col-span-2">
                        <label className="text-xs font-black uppercase text-slate-400 tracking-widest pl-1">Endereço Completo</label>
                        <input
                          value={localOrg.address}
                          onChange={e => setLocalOrg({ ...localOrg, address: e.target.value })}
                          className="rounded-xl border-[#dcdfe5] dark:border-[#2d333d] dark:bg-[#111621] text-sm dark:text-white h-11 px-4 shadow-sm"
                          placeholder="Rua, Número, Bairro, Cidade - UF"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-black uppercase text-slate-400 tracking-widest pl-1">Telefone</label>
                        <input
                          value={localOrg.phone}
                          onChange={e => setLocalOrg({ ...localOrg, phone: e.target.value })}
                          className="rounded-xl border-[#dcdfe5] dark:border-[#2d333d] dark:bg-[#111621] text-sm dark:text-white h-11 px-4 shadow-sm"
                          placeholder="(00) 00000-0000"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-black uppercase text-slate-400 tracking-widest pl-1">E-mail de Contato</label>
                        <input
                          value={localOrg.email}
                          onChange={e => setLocalOrg({ ...localOrg, email: e.target.value })}
                          className="rounded-xl border-[#dcdfe5] dark:border-[#2d333d] dark:bg-[#111621] text-sm dark:text-white h-11 px-4 shadow-sm"
                          placeholder="contato@empresa.com"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-black uppercase text-slate-400 tracking-widest pl-1">Website</label>
                        <input
                          value={localOrg.website}
                          onChange={e => setLocalOrg({ ...localOrg, website: e.target.value })}
                          className="rounded-xl border-[#dcdfe5] dark:border-[#2d333d] dark:bg-[#111621] text-sm dark:text-white h-11 px-4 shadow-sm"
                          placeholder="www.empresa.com.br"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Outras Abas... (Preservadas conforme original) */}
            {activeTab === 'preferencias' && (
              <div className="animate-in fade-in slide-in-from-right-2 duration-300 space-y-8">
                <h3 className="text-xl font-bold dark:text-white">Personalização da Interface</h3>
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <div className="flex gap-4 items-center">
                      <div className="bg-slate-200 dark:bg-slate-700 p-2 rounded-lg text-slate-600 dark:text-slate-300">
                        <span className="material-symbols-outlined">dark_mode</span>
                      </div>
                      <div>
                        <p className="text-sm font-bold dark:text-white">Modo Escuro</p>
                        <p className="text-xs text-slate-500">Alterna entre os temas claro e escuro do sistema.</p>
                      </div>
                    </div>
                    <button
                      onClick={handleToggleDarkMode}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isDarkMode ? 'bg-primary' : 'bg-slate-300'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isDarkMode ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'seguranca' && (
              <SecuritySettings />
            )}

            {/* Global Actions */}
            <div className="mt-12 pt-8 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {showSuccess && (
                  <span className="flex items-center gap-1.5 text-success text-xs font-bold animate-in fade-in slide-in-from-left-2">
                    <span className="material-symbols-outlined text-[18px]">check_circle</span>
                    Alterações salvas com sucesso!
                  </span>
                )}
                {saveError && (
                  <span className="flex items-center gap-1.5 text-red-500 text-xs font-bold animate-in fade-in slide-in-from-left-2">
                    <span className="material-symbols-outlined text-[18px]">error</span>
                    {saveError}
                  </span>
                )}
              </div>
              <div className="flex gap-4">
                <button className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                  Descartar
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-primary text-white px-8 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 min-w-[140px] justify-center"
                >
                  {isSaving ? (
                    <>
                      <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Salvando...
                    </>
                  ) : 'Salvar Alterações'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Configuracoes;
