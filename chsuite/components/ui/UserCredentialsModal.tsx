import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { useToast } from '../../context/ToastContext';

interface UserCredentialsModalProps {
    isOpen: boolean;
    onClose: () => void;
    email?: string;
    password?: string;
}

export const UserCredentialsModal: React.FC<UserCredentialsModalProps> = ({
    isOpen,
    onClose,
    email,
    password
}) => {
    const { showToast } = useToast();

    if (!email || !password) return null;

    const handleCopyAll = () => {
        const text = `Acesso ChSuite\nEmail: ${email}\nSenha: ${password}`;
        navigator.clipboard.writeText(text);
        showToast("Dados copiados para a área de transferência!");
    };

    const handleCopyItem = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        showToast(`${label} copiado!`);
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Colaborador Cadastrado!"
            icon="check_circle"
        >
            <div className="flex flex-col gap-6 p-2">
                <div className="bg-green-50 dark:bg-green-950/20 border border-green-100 dark:border-green-800/40 p-4 rounded-2xl flex items-center gap-4">
                    <div className="size-12 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center text-green-600">
                        <span className="material-symbols-outlined text-3xl">verified</span>
                    </div>
                    <div className="flex flex-col">
                        <p className="text-green-800 dark:text-green-200 font-bold">Acesso criado com sucesso</p>
                        <p className="text-green-700/70 dark:text-green-400/70 text-xs">O colaborador já pode acessar o portal e definir sua própria senha.</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex flex-col gap-1.5 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 relative group">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">E-mail de Acesso</label>
                        <p className="text-sm font-bold dark:text-white">{email}</p>
                        <button
                            onClick={() => handleCopyItem(email, 'E-mail')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <span className="material-symbols-outlined text-slate-400 text-sm">content_copy</span>
                        </button>
                    </div>

                    <div className="flex flex-col gap-1.5 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 relative group">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Senha Temporária</label>
                        <p className="text-sm font-black text-primary tracking-widest">{password}</p>
                        <button
                            onClick={() => handleCopyItem(password, 'Senha')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <span className="material-symbols-outlined text-slate-400 text-sm">content_copy</span>
                        </button>
                    </div>
                </div>

                <div className="bg-amber-50 dark:bg-amber-950/20 p-4 rounded-2xl border border-amber-100 dark:border-amber-800/40">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="material-symbols-outlined text-amber-500 text-sm">warning</span>
                        <p className="text-[11px] font-black text-amber-800 dark:text-amber-200 uppercase tracking-widest">Atenção</p>
                    </div>
                    <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
                        Esta senha é temporária e deve ser alterada no primeiro acesso. Certifique-se de copiá-la agora, pois ela não será exibida novamente por motivos de segurança.
                    </p>
                </div>

                <div className="flex gap-3">
                    <Button
                        variant="secondary"
                        fullWidth
                        onClick={handleCopyAll}
                        icon="content_copy"
                    >
                        Copiar Tudo
                    </Button>
                    <Button variant="primary" fullWidth onClick={onClose}>Fechar</Button>
                </div>
            </div>
        </Modal>
    );
};
