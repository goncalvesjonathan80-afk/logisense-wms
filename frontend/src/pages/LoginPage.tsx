import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Boxes, Lock, Mail, ArrowRight, Shield, AlertCircle, Info } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { DemoAccount } from '../types';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, user } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [demoAccounts, setDemoAccounts] = useState<DemoAccount[]>([]);
  const [showForgotModal, setShowForgotModal] = useState(false);

  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    api
      .getDemoAccounts()
      .then((res) => setDemoAccounts(res.accounts))
      .catch((err) => console.warn('Não foi possível carregar contas demo:', err));
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showForgotModal) {
        setShowForgotModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showForgotModal]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setErrorMessage(err.message || 'Credenciais inválidas. Verifique seu e-mail e senha.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoAccount = (acc: DemoAccount) => {
    setEmail(acc.email);
    setPassword(acc.suggestedPassword);
    setErrorMessage('');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Marca LOGISENSE WMS */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-11 h-11 rounded-sm bg-sky-600 text-white shadow-none border border-sky-500 mb-3" aria-hidden="true">
            <Boxes className="w-5 h-5" />
          </div>
          <h1 className="text-lg font-bold tracking-tight text-white uppercase font-sans">
            LOGISENSE WMS
          </h1>
          <p className="mt-0.5 text-xs text-slate-300">
            Sistema Integrado de Gestão de Armazém
          </p>
        </div>

        {/* Card de Autenticação Corporativo */}
        <div className="mt-6 bg-slate-800 border border-slate-700 rounded-md p-6 sm:p-7 shadow-none">
          <form className="space-y-4" onSubmit={handleSubmit}>
            {errorMessage && (
              <div
                role="alert"
                className="flex items-start gap-2.5 p-2.5 rounded-sm bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" aria-hidden="true" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold text-slate-300 mb-1"
              >
                E-mail Corporativo
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nome@logisense.com"
                  className="block w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-sm text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold text-slate-300"
                >
                  Senha de Acesso
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-[11px] text-sky-400 hover:text-sky-300 transition-colors"
                >
                  Recuperar senha
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-sm text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-sm text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-400 disabled:opacity-50 transition-colors"
            >
              {loading ? (
                <span>Autenticando...</span>
              ) : (
                <>
                  <span>Entrar no Sistema</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Perfis de Acesso de Demonstração (ocultos quando desativados em produção) */}
          {demoAccounts.length > 0 && (
            <div className="mt-6 pt-5 border-t border-slate-700">
              <div className="flex items-center justify-between text-xs text-slate-400 font-medium mb-2.5">
                <span>Perfis de Demonstração</span>
                <span className="text-[10px] text-slate-500">1 clique para testar</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {demoAccounts.map((acc) => (
                  <button
                    key={acc.email}
                    type="button"
                    onClick={() => fillDemoAccount(acc)}
                    className="p-2 text-left bg-slate-900 hover:bg-slate-750 border border-slate-700/80 rounded-sm transition-colors group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-200 group-hover:text-sky-300">
                        {acc.role}
                      </span>
                      <Shield className="w-3 h-3 text-slate-500" />
                    </div>
                    <div className="text-[10px] text-slate-400 truncate mt-0.5">
                      {acc.email}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Rodapé Corporativo */}
        <p className="mt-6 text-center text-xs text-slate-500">
          LOGISENSE WMS &copy; {new Date().getFullYear()} • Plataforma de Gestão de Armazém
        </p>
      </div>

      {/* Modal Informativo */}
      {showForgotModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="forgot-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70"
        >
          <div className="bg-slate-800 border border-slate-700 rounded-md max-w-sm w-full p-5 text-slate-200 shadow-lg">
            <div className="flex items-center gap-2 text-sky-400 mb-2">
              <Info className="w-4 h-4" aria-hidden="true" />
              <h3 id="forgot-modal-title" className="font-semibold text-white text-xs">
                Recuperação de Acesso
              </h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              Para recuperação ou redefinição de credenciais de acesso corporativo, solicite o procedimento junto ao administrador de TI responsável pelo LOGISENSE WMS.
            </p>
            <button
              type="button"
              onClick={() => setShowForgotModal(false)}
              className="w-full py-1.5 bg-slate-700 hover:bg-slate-600 rounded-sm text-xs font-semibold text-white transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
