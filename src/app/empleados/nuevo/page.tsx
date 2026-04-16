"use client";

import React, { useState } from "react";
import { ArrowLeft, Save, UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// --- CATÁLOGOS EXTRAÍDOS DE LOS PDF ---
const ESTADOS = [
    "Aguascalientes", "Baja California", "Baja California Sur", "Campeche", "Coahuila", "Colima",
    "Chiapas", "Chihuahua", "Ciudad de México", "Durango", "Guanajuato", "Guerrero", "Hidalgo",
    "Jalisco", "Estado de México", "Michoacán de Ocampo", "Morelos", "Nayarit", "Nuevo León", "Oaxaca",
    "Puebla", "Querétaro", "Quintana Roo", "San Luis Potosí", "Sinaloa", "Sonora", "Tabasco",
    "Tamaulipas", "Tlaxcala", "Veracruz", "Yucatán", "Zacatecas"
];

const TIPOS_CONTRATO = [
    { id: "01", nombre: "01 - Contrato de trabajo por tiempo indeterminado" },
    { id: "02", nombre: "02 - Contrato de trabajo para obra determinada" },
    { id: "03", nombre: "03 - Contrato de trabajo por tiempo determinado" },
    { id: "04", nombre: "04 - Contrato de trabajo por temporada" },
    { id: "05", nombre: "05 - Contrato de trabajo sujeto a prueba" },
    { id: "06", nombre: "06 - Contrato de trabajo con capacitación inicial" },
    { id: "07", nombre: "07 - Modalidad de contratación por pago de hora laborada" },
    { id: "08", nombre: "08 - Modalidad de trabajo por comisión laboral" },
    { id: "09", nombre: "09 - Modalidades de contratación donde no existe relación de trabajo" },
    { id: "10", nombre: "10 - Jubilación, pensión, retiro" },
    { id: "99", nombre: "99 - Otro contrato" },
];

const REGIMENES = [
    { id: "02", nombre: "02 - Sueldos" },
    { id: "03", nombre: "03 - Jubilados" },
    { id: "04", nombre: "04 - Pensionados" },
    { id: "05", nombre: "05 - Asimilados miembros sociedades cooperativas de producción" },
    { id: "06", nombre: "06 - Asimilados integrantes sociedades o Asociaciones Civiles" },
    { id: "07", nombre: "07 - Asimilados miembros de consejos" },
    { id: "08", nombre: "08 - Asimilados comisionistas" },
    { id: "09", nombre: "09 - Asimilados honorarios" },
    { id: "10", nombre: "10 - Asimilados acciones" },
    { id: "11", nombre: "11 - Asimilados otros" },
    { id: "12", nombre: "12 - Jubilados o pensionados" },
    { id: "99", nombre: "99 - Otro régimen" },
];

const TIPOS_JORNADA = [
    { id: "01", nombre: "01 - Diurna" },
    { id: "02", nombre: "02 - Nocturna" },
    { id: "03", nombre: "03 - Mixta" },
    { id: "04", nombre: "04 - Por hora" },
    { id: "05", nombre: "05 - Reducida" },
    { id: "06", nombre: "06 - Continuada" },
    { id: "07", nombre: "07 - Partida" },
    { id: "08", nombre: "08 - Por turnos" },
    { id: "99", nombre: "99 - Otra Jornada" },
];

const PERIODICIDADES = [
    { id: "01", nombre: "01 - Diario" },
    { id: "02", nombre: "02 - Semanal" },
    { id: "03", nombre: "03 - Catorcenal" },
    { id: "04", nombre: "04 - Quincenal" },
    { id: "05", nombre: "05 - Mensual" },
    { id: "06", nombre: "06 - Bimestral" },
    { id: "07", nombre: "07 - Unidad obra" },
    { id: "08", nombre: "08 - Comisión" },
    { id: "09", nombre: "09 - Precio alzado" },
    { id: "10", nombre: "10 - Decenal" },
    { id: "99", nombre: "99 - Otra periodicidad" },
];

const BANCOS = [
    "BANAMEX", "BANCOMEXT", "BANOBRAS", "BBVA BANCOMER", "SANTANDER", "BANJERCITO", "HSBC",
    "BAJIO", "IXE", "INBURSA", "INTERACCIONES", "MIFEL", "SCOTIABANK", "BANREGIO", "INVEX",
    "BANSI", "AFIRME", "BANORTE", "THE ROYAL BANK", "AMERICAN EXPRESS", "BAMSA", "TOKYO",
    "JP MORGAN", "BMONEX", "VE POR MAS", "ING", "DEUTSCHE", "CREDIT SUISSE", "AZTECA",
    "AUTOFIN", "BARCLAYS", "COMPARTAMOS", "BANCO FAMSA", "BMULTIVA", "ACTINVER", "WAL-MART",
    "NAFIN", "INTERBANCO", "BANCOPPEL", "ABC CAPITAL", "UBS BANK", "CONSUBANCO", "VOLKSWAGEN",
    "CIBANCO", "BBASE", "BANSEFI", "MONEXCB", "GBM", "VALUE", "VECTOR"
];

export default function NuevoEmpleadoPage() {
    const router = useRouter();
    const [isSaving, setIsSaving] = useState(false);

    // Estado del formulario directamente alineado a la base de datos
    const [formData, setFormData] = useState({
        nombre: "", apellidoPaterno: "", apellidoMaterno: "", curp: "", nss: "", rfc: "",
        calle: "", colonia: "", numExterior: "", numInterior: "", cp: "", localidad: "",
        municipio: "", estado: "", email: "", grupo: "", sucursal: "", fechaRelacionLaboral: new Date().toISOString().split('T')[0],
        salario: 0, salarioCuotas: 0, contrato: "", regimenContratacion: "", riesgoPuesto: "1",
        tipoJornada: "", banco: "", clabe: "", periodicidad: "", departamento: "",
        puesto: "", numEmpleado: ""
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const payload = {
                ...formData,
                salario: parseFloat(formData.salario.toString() || "0"),
                salarioCuotas: parseFloat(formData.salarioCuotas.toString() || "0"),
                fechaRelacionLaboral: new Date(formData.fechaRelacionLaboral).toISOString(),
            };

            const res = await fetch("/api/empleados", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                alert("Empleado agregado correctamente");
                router.push("/empleados");
            } else {
                const errorData = await res.json();
                alert(`Error: ${errorData.error || "No se pudo guardar"}`);
            }
        } catch (error) {
            alert("Error de conexión al guardar.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="p-6 bg-slate-50 min-h-screen">
            <div className="max-w-6xl mx-auto">
                <div className="mb-4">
                    <Link href="/empleados" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors">
                        <ArrowLeft size={18} />
                        Regresar a Empleados
                    </Link>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3 bg-slate-50">
                        <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                            <UserPlus size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">Nuevo Empleado</h2>
                            <p className="text-sm text-slate-500">Completa los datos del trabajador para el timbrado de nómina</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 space-y-6">
                        {/* SECCIÓN 1: IDENTIFICACIÓN Y AGRUPACIÓN */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-slate-700 mb-1">Nombre(s) *</label>
                                <input required name="nombre" onChange={handleChange} type="text" className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Apellido Paterno *</label>
                                <input required name="apellidoPaterno" onChange={handleChange} type="text" className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Apellido Materno</label>
                                <input name="apellidoMaterno" onChange={handleChange} type="text" className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Grupo</label>
                                <select name="grupo" onChange={handleChange} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white">
                                    <option value="">Selecciona un grupo</option>
                                    <option value="Administrativo">Administrativo</option>
                                    <option value="Operativo">Operativo</option>
                                    <option value="General">General</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Sucursal</label>
                                <select name="sucursal" onChange={handleChange} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white">
                                    <option value="">Seleccionar sucursal</option>
                                    <option value="Matriz">Matriz</option>
                                    <option value="Sucursal 1">Sucursal 1</option>
                                </select>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-slate-700 mb-1">Número de Empleado (Control Interno) *</label>
                                <input required name="numEmpleado" onChange={handleChange} type="text" className="w-full border border-slate-300 rounded-lg p-2.5 text-sm" />
                            </div>
                        </div>

                        {/* SECCIÓN 2: DATOS FISCALES Y DE NÓMINA (INFERIOR DEL PDF) */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">CURP *</label>
                                <input required name="curp" onChange={handleChange} maxLength={18} type="text" className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none uppercase" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">RFC *</label>
                                <input required name="rfc" onChange={handleChange} maxLength={13} type="text" className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none uppercase" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Salario diario (Cuotas) *</label>
                                <input required name="salarioCuotas" onChange={handleChange} type="number" step="0.01" className="w-full border border-slate-300 rounded-lg p-2.5 text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Tipo de contrato *</label>
                                <select required name="contrato" onChange={handleChange} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white text-slate-700">
                                    <option value="">Seleccione el tipo de contrato</option>
                                    {TIPOS_CONTRATO.map((tipo) => (
                                        <option key={tipo.id} value={tipo.id}>{tipo.nombre}</option>
                                    ))}
                                </select>
                            </div>

                            {/* DOMICILIO COMPLETO */}
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-slate-700 mb-1">Calle *</label>
                                <input required name="calle" onChange={handleChange} type="text" className="w-full border border-slate-300 rounded-lg p-2.5 text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Colonia *</label>
                                <input required name="colonia" onChange={handleChange} type="text" className="w-full border border-slate-300 rounded-lg p-2.5 text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Régimen de contratación *</label>
                                <select required name="regimenContratacion" onChange={handleChange} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white text-slate-700">
                                    <option value="">Seleccione Régimen</option>
                                    {REGIMENES.map((reg) => (
                                        <option key={reg.id} value={reg.id}>{reg.nombre}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">No. Ext *</label>
                                <input required name="numExterior" onChange={handleChange} type="text" className="w-full border border-slate-300 rounded-lg p-2.5 text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">No. Int</label>
                                <input name="numInterior" onChange={handleChange} type="text" className="w-full border border-slate-300 rounded-lg p-2.5 text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Localidad</label>
                                <input name="localidad" onChange={handleChange} type="text" className="w-full border border-slate-300 rounded-lg p-2.5 text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Tipo de jornada *</label>
                                <select required name="tipoJornada" onChange={handleChange} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white text-slate-700">
                                    <option value="">Seleccione el tipo de jornada</option>
                                    {TIPOS_JORNADA.map((jor) => (
                                        <option key={jor.id} value={jor.id}>{jor.nombre}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Código Postal *</label>
                                <input required name="cp" onChange={handleChange} type="text" className="w-full border border-slate-300 rounded-lg p-2.5 text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Municipio *</label>
                                <input required name="municipio" onChange={handleChange} type="text" className="w-full border border-slate-300 rounded-lg p-2.5 text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Estado *</label>
                                <select required name="estado" onChange={handleChange} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white">
                                    <option value="">Seleccione Estado</option>
                                    {ESTADOS.map((est) => (
                                        <option key={est} value={est}>{est}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Banco (Opcional)</label>
                                <select name="banco" onChange={handleChange} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white">
                                    <option value="">Seleccione Banco (Opcional)</option>
                                    {BANCOS.map((ban) => (
                                        <option key={ban} value={ban}>{ban}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-slate-700 mb-1">E-Mail (Opcional)</label>
                                <input name="email" onChange={handleChange} type="email" className="w-full border border-slate-300 rounded-lg p-2.5 text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">CLABE Interbancaria (Opcional)</label>
                                <input name="clabe" onChange={handleChange} maxLength={18} type="text" className="w-full border border-slate-300 rounded-lg p-2.5 text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Periodicidad de Pago *</label>
                                <select required name="periodicidad" onChange={handleChange} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white text-slate-700">
                                    <option value="">Seleccione Periodicidad</option>
                                    {PERIODICIDADES.map((per) => (
                                        <option key={per.id} value={per.id}>{per.nombre}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Departamento (Opcional)</label>
                                <input name="departamento" onChange={handleChange} type="text" className="w-full border border-slate-300 rounded-lg p-2.5 text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Puesto (Opcional)</label>
                                <input name="puesto" onChange={handleChange} type="text" className="w-full border border-slate-300 rounded-lg p-2.5 text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">No. Seguridad Social (NSS)</label>
                                <input name="nss" onChange={handleChange} maxLength={11} type="text" className="w-full border border-slate-300 rounded-lg p-2.5 text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Fecha de Inicio de Relación Laboral</label>
                                <input required name="fechaRelacionLaboral" value={formData.fechaRelacionLaboral} onChange={handleChange} type="date" className="w-full border border-slate-300 rounded-lg p-2.5 text-sm" />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-200">
                            <Link href="/empleados" className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">
                                Cancelar
                            </Link>
                            <button disabled={isSaving} type="submit" className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-blue-400">
                                <Save size={18} />
                                {isSaving ? "Guardando en BD..." : "Guardar Empleado"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}