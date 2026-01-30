
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Card, CardContent } from './ui/Card';

const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [userName, setUserName] = useState('');
    const [loading, setLoading] = useState(false);
    const [isSignUp, setIsSignUp] = useState(false);
    const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);
    const [companyName, setCompanyName] = useState('');
    const [companyLogo, setCompanyLogo] = useState('');
    const [isSettingsLoading, setIsSettingsLoading] = useState(true);


    useEffect(() => {
        const fetchCompanySettings = async () => {
            try {
                const { data, error } = await supabase
                    .from('company_settings')
                    .select('*')
                    .single();

                if (error) throw error;
                if (data) {
                    setCompanyName(data.company_name || 'ChSuite');
                    setCompanyLogo(data.logo || '');
                }
            } catch (err) {
                console.error('Error fetching company settings for login:', err);
            }
        };

        fetchCompanySettings().finally(() => setIsSettingsLoading(false));
    }, []);


    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            if (isSignUp) {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: userName || email.split('@')[0],
                        }
                    }
                });
                if (error) throw error;
                setMessage({ type: 'success', text: 'Verifique seu e-mail para confirmar o cadastro!' });
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
            }
        } catch (error: any) {
            let errorMessage = error.message || 'Ocorreu um erro na autenticação.';

            // Tradução de erros comuns do Supabase
            if (errorMessage.includes('Invalid login credentials')) {
                errorMessage = 'E-mail ou senha incorretos.';
            } else if (errorMessage.includes('rate limit exceeded')) {
                errorMessage = 'Muitas tentativas. Por favor aguarde alguns instantes ou verifique as configurações do projeto.';
            } else if (errorMessage.includes('User already registered')) {
                errorMessage = 'Este e-mail já está cadastrado.';
            }

            setMessage({ type: 'error', text: errorMessage });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-[#f0f2f5] relative overflow-hidden p-6">
            {/* Background Aesthetics */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/5 blur-[120px] rounded-full animate-pulse"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-orange-500/5 blur-[120px] rounded-full animate-pulse"></div>

            <div className="w-full max-w-[440px] relative z-10 animate-in fade-in zoom-in-95 duration-700">
                <div className={`flex flex-col items-center mb-10 transition-all duration-1000 ${isSettingsLoading ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
                    {companyLogo ? (
                        <img
                            src={companyLogo}
                            alt={companyName}
                            className="h-16 mb-6 drop-shadow-xl animate-in zoom-in duration-500"
                        />
                    ) : (
                        <div className="size-16 bg-[#ffcea8] rounded-2xl flex items-center justify-center shadow-xl shadow-orange-500/10 rotate-3 hover:rotate-0 transition-transform duration-500 mb-6 group cursor-default">
                            <span className="material-symbols-outlined text-[#4a3b32] text-4xl font-black group-hover:scale-110 transition-transform">data_usage</span>
                        </div>
                    )}
                    <h1 className="text-2xl font-black text-slate-800 tracking-tighter text-center">{companyName || 'Carregando...'}</h1>
                </div>


                <Card className="border-slate-200 bg-white shadow-xl shadow-slate-200/50 overflow-hidden">
                    <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-primary to-orange-400"></div>
                    <CardContent className="p-8 md:p-10">
                        <div className="mb-8">
                            <h2 className="text-2xl font-bold text-slate-800 mb-2">
                                {isSignUp ? 'Criar nova conta' : 'Seja bem-vindo'}
                            </h2>
                            <p className="text-sm text-slate-500">
                                {isSignUp ? 'Preencha os dados para começar' : 'Entre com suas credenciais para acessar'}
                            </p>
                        </div>

                        <form onSubmit={handleAuth} className="space-y-5">
                            {isSignUp && (
                                <div className="space-y-1.5 translate-y-0 animate-in slide-in-from-top-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Nome Completo</label>
                                    <Input
                                        type="text"
                                        placeholder="Seu nome"
                                        value={userName}
                                        onChange={e => setUserName(e.target.value)}
                                        required
                                        className="h-12 bg-slate-50 border-slate-200 focus:border-blue-500 text-slate-800 placeholder:text-slate-400"
                                    />
                                </div>
                            )}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">E-mail Corporativo</label>
                                <Input
                                    type="email"
                                    placeholder="seu@email.com"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    required
                                    className="h-12 bg-slate-50 border-slate-200 focus:border-blue-500 text-slate-800 placeholder:text-slate-400"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <div className="flex justify-between items-center">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Senha</label>
                                    {!isSignUp && (
                                        <button type="button" className="text-[10px] font-bold text-blue-600 hover:text-blue-700 uppercase tracking-wider">Esqueci a senha</button>
                                    )}
                                </div>
                                <Input
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    required
                                    className="h-12 bg-slate-50 border-slate-200 focus:border-blue-500 text-slate-800 placeholder:text-slate-400"
                                />
                            </div>

                            {message && (
                                <div className={`p-4 rounded-xl text-xs font-bold animate-in fade-in slide-in-from-top-1 ${message.type === 'error' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-50 text-green-600 border border-green-100'
                                    }`}>
                                    {message.text}
                                </div>
                            )}

                            <Button
                                type="submit"
                                fullWidth
                                disabled={loading}
                                className="h-12 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest text-xs shadow-lg shadow-blue-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                            >
                                {loading ? (
                                    <div className="flex items-center gap-2">
                                        <div className="size-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                        <span>Processando...</span>
                                    </div>
                                ) : (isSignUp ? 'Criar Conta' : 'Entrar na Plataforma')}
                            </Button>
                        </form>

                        <div className="mt-8 pt-8 border-t border-slate-100 text-center">
                            <p className="text-sm text-slate-500 font-medium">
                                {isSignUp ? 'Já possui uma conta?' : 'Não tem uma conta corporativa?'}
                                <button
                                    onClick={() => {
                                        setIsSignUp(!isSignUp);
                                        setMessage(null);
                                    }}
                                    className="ml-2 text-blue-600 hover:text-blue-700 font-bold transition-colors"
                                >
                                    {isSignUp ? 'Fazer login' : 'Solicitar acesso'}
                                </button>
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <p className="mt-10 text-center text-slate-400 text-xs font-bold uppercase tracking-[.2em] opacity-70">
                    &copy; {new Date().getFullYear()} {companyName.toUpperCase()} &bull; CORPORATE SOLUTIONS
                </p>
            </div>
        </div>
    );
};

export default Login;
