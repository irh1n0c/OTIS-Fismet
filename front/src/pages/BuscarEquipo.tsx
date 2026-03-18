import { useState } from "react";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, Trash2 } from "lucide-react";
import { buscarEquipoPorCodigo, eliminarEquipo } from "../services/api";


interface Props {
}

export function BuscarEquipo({}: Props) {
  const [codigoEquipo, setCodigoEquipo] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const codigo = codigoEquipo.trim();
    if (!codigo) return;
    navigate(`/editar-reportes?codigoEquipo=${encodeURIComponent(codigo)}`);
  };

  const handleEliminar = async () => {
    const codigo = codigoEquipo.trim();
    if (!codigo) return;

    const ok = window.confirm(
      `¿Seguro que quieres eliminar el reporte del equipo con código "${codigo}"?\n\nEsta acción no se puede deshacer.`
    );
    if (!ok) return;

    setLoading(true);
    setSuccess(null);
    setError(null);

    try {
      const { bloque, reporte } = await buscarEquipoPorCodigo(codigo);
      await eliminarEquipo(bloque._id, reporte._id);
      setSuccess("Reporte eliminado correctamente.");
      setCodigoEquipo("");
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: unknown }).message)
          : "No se pudo eliminar el reporte. Verifica el código e inténtalo nuevamente.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-start justify-center bg-white-50 pt-8">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="bg-stone-50 border-b">
          <CardTitle>Buscar Equipo</CardTitle>
          <CardDescription>
            Ingrese el código del equipo para editar el reporte
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="codigo">Código de Equipo</Label>
              <Input
                id="codigo"
                value={codigoEquipo}
                onChange={(e) => setCodigoEquipo(e.target.value)}
                placeholder="Ej: 2121"
                required
                disabled={loading}
              />
            </div>

            <Button type="submit" className="w-full gap-2" disabled={loading}>
              <Search className="h-4 w-4" />
              Editar reporte
            </Button>

            <Button
              type="button"
              className="w-full gap-2"
              variant="destructive"
              onClick={handleEliminar}
              disabled={loading}
            >
              <Trash2 className="h-4 w-4" />
              Eliminar reporte
            </Button>
          </form>

          {success && (
            <div className="mt-4">
              <Alert className="bg-green-50 border-green-500">
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>Éxito</AlertTitle>
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            </div>
          )}

          {error && (
            <div className="mt-4">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
