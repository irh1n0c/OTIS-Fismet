import { useState } from "react";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search } from "lucide-react";
import { useNavigate } from "react-router-dom";


interface Props {
}

export function BuscarEquipo({}: Props) {
  const [codigoEquipo, setCodigoEquipo] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const codigo = codigoEquipo.trim();
    if (!codigo) return;
    navigate(`/editar-reportes?codigoEquipo=${encodeURIComponent(codigo)}`);
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
              />
            </div>

            <Button type="submit" className="w-full gap-2">
              <Search className="h-4 w-4" />
              Buscar
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
