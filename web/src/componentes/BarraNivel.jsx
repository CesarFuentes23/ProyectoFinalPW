export default function BarraNivel({ cantidad, minimo }) {
    const tope = Math.max(minimo * 3, cantidad, 1);
    const lleno = Math.min((cantidad / tope) * 100, 100);
    const marca = Math.min((minimo / tope) * 100, 100);
    const color = cantidad <= 0 ? 'bg-cereza' : cantidad <= minimo ? 'bg-maiz' : 'bg-cafe-600';

    return (
        <div className="relative h-2 w-28 rounded-full bg-piedra-100" aria-hidden="true">
            <div className={`h-2 rounded-full ${color}`} style={{ width: `${lleno}%` }} />
            {minimo > 0 && (
                <div className="absolute -top-1 h-4 w-0.5 bg-tinta" style={{ left: `${marca}%` }} />
            )}
        </div>
    );
}