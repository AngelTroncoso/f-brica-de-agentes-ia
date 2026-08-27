import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Loader2, Send, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { enviarContacto } from "@/lib/agentes.functions";
import { contactoInput } from "@/lib/agentes.tipos";

export function ContactoForm() {
  const [valores, setValores] = useState({ nombre: "", email: "", descripcion: "" });
  const [errores, setErrores] = useState<Record<string, string>>({});
  const enviar = useServerFn(enviarContacto);

  const mutacion = useMutation({
    mutationFn: (data: { nombre: string; email: string; descripcion: string }) =>
      enviar({ data }),
    onSuccess: () => {
      toast.success("¡Listo! Te contactaremos pronto.");
      setValores({ nombre: "", email: "", descripcion: "" });
    },
  });

  const onSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();
    const parsed = contactoInput.safeParse(valores);
    if (!parsed.success) {
      const e: Record<string, string> = {};
      for (const issue of parsed.error.issues) e[String(issue.path[0])] = issue.message;
      setErrores(e);
      return;
    }
    setErrores({});
    mutacion.mutate(parsed.data);
  };

  if (mutacion.isSuccess) {
    return (
      <div className="panel animate-rise flex flex-col items-start gap-3 p-6 sm:p-8">
        <CheckCircle2 className="size-8 text-success" />
        <h3 className="text-xl font-semibold">Mensaje recibido</h3>
        <p className="text-sm text-muted-foreground">
          Gracias por escribirnos. Revisaremos tu caso y te respondemos al correo que
          nos dejaste.
        </p>
        <Button variant="outline" onClick={() => mutacion.reset()}>
          Enviar otro mensaje
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="panel space-y-4 p-6 sm:p-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo
          id="nombre"
          label="Nombre"
          value={valores.nombre}
          error={errores["nombre"]}
          maxLength={120}
          placeholder="Camila Rojas"
          onChange={(v) => setValores((s) => ({ ...s, nombre: v }))}
        />
        <Campo
          id="email"
          label="Email"
          type="email"
          value={valores.email}
          error={errores["email"]}
          maxLength={255}
          placeholder="camila@minegocio.cl"
          onChange={(v) => setValores((s) => ({ ...s, email: v }))}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="descripcion">Cuéntanos brevemente tu caso</Label>
        <Textarea
          id="descripcion"
          rows={4}
          maxLength={2000}
          value={valores.descripcion}
          placeholder="Qué agente quieres llevar a producción, con qué sistemas debería conversar y qué volumen manejas."
          aria-invalid={Boolean(errores["descripcion"])}
          onChange={(ev) =>
            setValores((s) => ({ ...s, descripcion: ev.target.value }))
          }
        />
        {errores["descripcion"] && (
          <p role="alert" className="text-sm text-destructive">
            {errores["descripcion"]}
          </p>
        )}
      </div>

      {mutacion.isError && (
        <p role="alert" className="flex items-center gap-2 text-sm text-destructive">
          <TriangleAlert className="size-4" /> No pudimos enviar tu mensaje. Inténtalo
          nuevamente.
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          Usamos tus datos solo para responderte. Nada se publica en el sitio.
        </p>
        <Button type="submit" size="lg" disabled={mutacion.isPending}>
          {mutacion.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}
          Enviar
        </Button>
      </div>
    </form>
  );
}

function Campo({
  id,
  label,
  value,
  onChange,
  error,
  type = "text",
  placeholder,
  maxLength,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string | undefined;
  type?: string;
  placeholder?: string;
  maxLength?: number;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        onChange={(ev) => onChange(ev.target.value)}
      />
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
