import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
    <path fill="#4285F4" d="M23.99 12.27c0-.82-.07-1.62-.2-2.4H12v4.55h6.52c-.28 1.54-1.12 2.84-2.4 3.71v3.07h3.89c2.28-2.1 3.59-5.17 3.59-8.93Z" />
    <path fill="#34A853" d="M12 24c3.24 0 5.96-1.06 7.95-2.86l-3.89-3.07c-1.08.72-2.47 1.14-4.06 1.14-3.12 0-5.76-2.1-6.71-4.92H1.28v3.09C3.24 21.78 7.31 24 12 24Z" />
    <path fill="#FBBC05" d="M5.29 14.29c-.24-.72-.38-1.49-.38-2.29 0-.8.14-1.57.38-2.29V6.62H1.28A11.97 11.97 0 0 0 0 12c0 1.96.47 3.82 1.28 5.38l4.01-3.09Z" />
    <path fill="#EA4335" d="M12 4.77c1.77 0 3.36.61 4.61 1.82l3.45-3.45C17.97 1.2 15.24 0 12 0 7.31 0 3.24 2.22 1.28 5.62l4.01 3.09C6.24 6.87 8.88 4.77 12 4.77Z" />
  </svg>
);

export const Login: React.FC = () => {
  return (
    <div className=" place-items-center bg-white px-4 py-10 sm:px-6 sm:py-14">
      <Card className="w-full max-w-full rounded-[28px] border border-slate-200 bg-slate-50 px-0 py-0 shadow-xl shadow-slate-200/40 sm:max-w-xl md:max-w-2xl">
        <CardHeader className="space-y-2 px-6 pt-8 text-center sm:px-10">
          <CardTitle className="text-3xl sm:text-4xl font-light text-slate-600">
            Bienvenido a OTIS - Fismet 2026
          </CardTitle>
          <p className="mx-auto max-w-xl px-2 text-sm text-slate-500 sm:text-base">
            Inicia sesión con una cuenta de Google para continuar.
          </p>
        </CardHeader>

        <CardContent className="space-y-3 px-3 pb-6 sm:px-10">
          <div className="rounded-[26px] bg-white px-3 py-3 shadow-sm shadow-slate-200/50 sm:px-6">
            <Button
              className="flex w-full items-center justify-center gap-3 rounded-xl bg-white px-4 py-3 text-sm font-light text-slate-900 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50 sm:text-base"
              onClick={() => {
                window.location.href = `${import.meta.env.VITE_API_URL}/api/auth/google`;
              }}
            >
              <GoogleIcon />
              <span>Continuar con Google</span>
            </Button>
          </div>

          <div className="rounded-3xl bg-white px-4 py-4 text-center text-xs text-slate-500 shadow-sm shadow-slate-200/20 sm:text-sm">
            Muchas gracias Fismetito.
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
