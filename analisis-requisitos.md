# Análisis de Requisitos vs Estado Actual del Sistema

> Fecha: 2026-05-08
> Basado en revisión de `BACKEND-5TO/` (Prisma + Express) y `FRONTEND-5TO/` (Astro + React)

### Decisiones tomadas durante el análisis
- **"Finalizada" en citas** = se refiere al estado de la cita (appointment status), no a la consulta.
- **Reparto 70/30** = se mantiene configurable por especialidad (`commission_percentage`), tal como está diseñado actualmente.
- **Encriptación de datos clínicos** = no se implementará. La seguridad se maneja mediante RBAC.

---

## 1. Requisitos Funcionales

### 📅 Gestión de Citas

| Requisito | Estado | Detalle |
|-----------|--------|---------|
| Registro de Citas | ✅ Implementado | Backend `Appointment` (Prisma) + CRUD completo. Frontend `AppointmentForm.tsx` y páginas de recepción/paciente. Véase: `BACKEND-5TO/src/modules/scheduling/appointment/` y `FRONTEND-5TO/src/components/react/AppointmentForm.tsx` |
| Interfaz de Calendario | ✅ Implementado | `react-big-calendar` con componentes `DoctorScheduleCalendar.tsx` y `DoctorScheduleCalendarWrapper.tsx`. Véase: `FRONTEND-5TO/src/components/react/DoctorScheduleCalendar.tsx` |
| Vistas Día/Semana | ✅ Implementado | Vistas `week`, `day`, `agenda` habilitadas en `react-big-calendar`. Véase: `FRONTEND-5TO/src/components/react/DoctorScheduleCalendar.tsx:341` |
| Vista Mes | ❌ Falta | El wrapper solo declara `'week' | 'day' | 'agenda'`. `react-big-calendar` soporta `month` pero no está habilitado. Véase: `FRONTEND-5TO/src/components/react/DoctorScheduleCalendarWrapper.tsx:19` |
| Validación de Conflictos (mismo doctor + misma hora) | ⚠️ Parcial | El sistema valida `patient_limit` por franja horaria y evita duplicado exacto (mismo doctor + mismo paciente + mismo `date_time`). **Pero NO impide que dos pacientes distintos queden a la misma hora** si el `patient_limit` lo permite. Además no hay constraint único en DB ni locking para concurrencia real. Véase: `BACKEND-5TO/src/modules/scheduling/appointment/appointment.service.ts:296-314` |
| Estado: Pendiente (con color) | ⚠️ Parcial | Existe `StatusAppointment` con `color_hex` y CRUD. El modelo soporta cualquier nombre. En frontend el mapeo de colores usa "Sin Confirmar" en vez de "Pendiente". Es un ajuste menor de naming en el frontend. Véase: `FRONTEND-5TO/src/components/react/DoctorScheduleCalendar.tsx:96-101` |
| Estado: Confirmada (con color) | ✅ Implementado | Status con color en DB y mapeo en frontend. |
| Estado: Cancelada (con color) | ✅ Implementado | Status con color en DB y mapeo en frontend. |
| Estado: Finalizada (con color) | ✅ Implementado | "Finalizada" se refiere al estado de la cita (appointment status), no a la consulta. El modelo `StatusAppointment` con `color_hex` lo soporta. En frontend se muestra como "Realizada" con color verde (`#22c55e`). Los estados son configurables vía CRUD. Véase: `FRONTEND-5TO/src/components/react/DoctorScheduleCalendar.tsx:97` |

**Resumen Citas**: Crear, calendario y estados básicos funcionan. Falta vista Mes y la validación de conflictos no es estricta. Los estados están correctos tal como están.

---

### 🩺 Consultas e Historial Clínico

| Requisito | Estado | Detalle |
|-----------|--------|---------|
| Registro de Consulta (síntomas, diagnósticos, tratamiento) | ⚚️ Parcial | Módulo `medical/consultation` con submódulos: `symptoms-consulta`, `clinical-examination`, `consultation-diagnosis`, `prescription`. Falta campo/estructura explícita para "tratamiento" (se cubre parcialmente con `Prescription.instructions`). Véase: `BACKEND-5TO/src/modules/medical/consultation/` y `BACKEND-5TO/prisma/schema.prisma:110-128` |
| Historial Clínico Protegido (acceso restringido) | ❌ Falta (crítico) | Frontend bloquea rutas por rol (middleware Astro). **Pero backend no protege rutas con `authMiddleware` ni RBAC**. Ejemplo: `auth/user` tiene `authMiddleware` comentado. Sin enforcement backend, cualquiera con acceso a la API puede leer/escribir datos clínicos. Véase: `BACKEND-5TO/src/modules/auth/user/user.route.ts:12` |
| Facturación Automática al finalizar consulta | ❌ Falta (crítico) | Docs afirman que se genera factura automáticamente, pero el código de `ConsultationService.finish()` **NO crea factura**. Lo que hace: marca `finished_at`, registra insumos/recetas/síntomas, consume inventario, crea `PayrollLine`. Falta crear `Invoice` proforma en la transacción. Véase: `BACKEND-5TO/src/modules/medical/consultation/consultation.service.ts:139-310` |
| Cálculo: monto base según especialidad | ✅ Implementado | `MedicalSpecialty.consultation_price` define el precio. Véase: `BACKEND-5TO/prisma/schema.prisma:103` |
| Cálculo: cargos por insumos adicionales | ✅ Implementado | `SupplyConsultation` vincula insumos a consultas y se consume stock FIFO. Véase: `BACKEND-5TO/prisma/schema.prisma:453-461` |
| Cálculo: IVA automático | ⚠️ Parcial | Existe modelo `Tax` (ej: IVA 16%) y se asocia a `Invoice.taxId`. **Pero no hay desglose de IVA por línea ni persistencia de base imponible vs impuesto**. No existe tabla `InvoiceDetail`. Véase: `BACKEND-5TO/prisma/schema.prisma:342-350` |
| Cálculo: IGTF condicional (3% efectivo divisas) | ⚠️ Parcial | Frontend calcula `igtf_amount` condicionalmente (cash + USD) y lo envía al backend. Backend guarda el valor pero **no valida la condición**. La lógica está en `CreateInvoiceModal.tsx:177-183`. Véase: `BACKEND-5TO/prisma/schema.prisma:320` |

**Resumen Consultas/Historial**: Modelo de datos rico (síntomas, diagnósticos, exámenes, recetas). La factura automática NO está implementada en código. RBAC backend inexistente. IVA/IGTF son parciales.

---

### 💰 Gestión de Pagos y Honorarios

| Requisito | Estado | Detalle |
|-----------|--------|---------|
| Lógica de Reparto 70/30 | ✅ Implementado | `MedicalSpecialty.commission_percentage` define el % de la clínica (configurable por especialidad). `InvoiceService` calcula "commissions" al crear factura desde cita. `PayrollLine` se genera al finalizar consulta con base y porcentaje. El diseño configurable es el correcto: cada especialidad define su propio reparto. Véase: `BACKEND-5TO/prisma/schema.prisma:104` y `BACKEND-5TO/src/modules/finance/invoice/invoice.service.ts:67-82` |
| Soporte Multi-moneda (VES + USD) | ⚚️ Parcial | `PaymentMethod.currency` enum USD/VES. Frontend permite pagos en VES convirtiendo a USD. **Backend tiene bug**: en `InvoiceService.create()` la lógica de conversión VES→USD es "temporal" y puede duplicar montos. Véase: `BACKEND-5TO/src/modules/finance/invoice/invoice.service.ts:226-235` |
| Tabla de Tasas de Cambio histórica | ✅ Implementado | `ExchangeRate` con `is_active` y `createdAt`. FK en `Invoice`, `InvoicePayment`, `InvoiceExpense`, etc. Véase: `BACKEND-5TO/prisma/schema.prisma:329-340` |
| Integridad Histórica de facturas | ✅ Implementado | `Invoice.exchangeRateId` fija la tasa usada al momento de la factura. No cambia aunque la tasa actual varíe. |
| Gestión de Gastos (proveedores) | ✅ Implementado | Módulo `expenses/`: `ExpenseCategory`, `InvoiceExpense`, `ExpensePayment`. Módulo `procurement/`: `Supplier`, `Purchase`, `PurchasePayment`. Véase: `BACKEND-5TO/src/modules/expenses/` y `BACKEND-5TO/src/modules/procurement/` |

**Resumen Pagos/Honorarios**: Tasas históricas, reparto configurable y gastos funcionan. Multi-moneda tiene bugs en el backend.

---

### 📊 Reportes Operativos y Financieros

| Requisito | Estado | Detalle |
|-----------|--------|---------|
| Tasa de Ausentismo | ❌ Falta | No hay endpoint ni lógica para calcular canceladas/no-show vs total. |
| Demanda por Especialidad | ❌ Falta | No hay endpoint ni consulta que identifique servicios más solicitados. |
| Ocupación de Agenda | ❌ Falta | No hay cálculo de horas productivas por médico. |
| Cierre de Caja Diario | ❌ Falta | No hay desglose de ingresos por método de pago (Efectivo $, Efectivo Bs, Transferencia, Pago Móvil). |
| Libro de Ventas (Excel/PDF) | ❌ Falta | No hay generación de reporte contable exportable. No hay librería de exportación (exceljs, pdfkit, etc.). |
| Balance General | ❌ Falta | No hay módulo de contabilidad (Activos, Pasivos, Patrimonio). |
| Estado de Resultados | ❌ Falta | No hay cálculo de Ingresos - Gastos como reporte financiero formal. |
| Control de Honorarios (por pagar) | ⚚️ Parcial | Existe `Payroll` + `PayrollLine` (nómina devengada). **Pero no hay flujo de pago de nómina** (el `ExpenseLedgerService` advierte que "PAID no soportado"). Véase: `BACKEND-5TO/src/modules/report/expenseLedger/expenseLedger.service.ts:217-219` |
| Inventario de Insumos (consumo) | ⚚️ Parcial | Se consume stock al finalizar consulta (`StockMovement` OUT). **Pero no hay reporte de consumo** basado en cargos de consulta. Véase: `BACKEND-5TO/src/modules/medical/consultation/consultation.service.ts:197-246` |

**Único reporte backend existente**: `ExpenseLedgerService` (consolidado OPEX + compras + nómina devengada). Véase: `BACKEND-5TO/src/modules/report/expenseLedger/expenseLedger.service.ts`

**Resumen Reportes**: Casi todo falta. Solo existe un ledger de egresos y dashboards UI básicos en frontend.

---

### 🔐 Gestión de Roles y Permisos

| Requisito | Estado | Detalle |
|-----------|--------|---------|
| Modelo de Roles (Admin/Recepcionista/Doctor/Paciente) | ✅ Implementado | Tablas `Role`/`User` con `code` (ADMIN, DOCTOR, RECEPTION, PATIENT). Frontend mapea roles a rutas. Véase: `FRONTEND-5TO/src/middleware.ts:3-8` |
| Login + JWT | ✅ Implementado | `AuthService.login()` genera JWT. `authMiddleware` decodifica token. Véase: `BACKEND-5TO/src/modules/auth/login/login.service.ts` |
| RBAC backend (protección por rol en cada endpoint) | ❌ Falta (crítico) | La mayoría de rutas **NO usan `authMiddleware`**. Ejemplo: `auth/user` tiene el middleware comentado. No hay middleware de autorización por rol. Véase: `BACKEND-5TO/src/modules/auth/user/user.route.ts:12` |
| Frontend: protección por rol | ✅ Implementado | Middleware Astro redirige según rol del usuario. Véase: `FRONTEND-5TO/src/middleware.ts:107-202` |
| Paciente: solo lectura de su propio historial | ⚚️ Parcial | Frontend verifica que el `patientId` de la URL pertenezca al usuario autenticado. **Pero backend no valida esto**. Véase: `FRONTEND-5TO/src/middleware.ts:171-198` |

**Resumen Roles**: Modelo de roles y login funcionan. Frontend protege rutas. **Backend no tiene RBAC** — es la mayor vulnerabilidad del sistema.

---

## 2. Requisitos No Funcionales

### 🛡️ Seguridad y Privacidad

| Requisito | Estado | Detalle |
|-----------|--------|---------|
| Encriptación de Datos sensibles | ✅ No requerido | Se decidió no implementar encriptación a nivel de aplicación. La protección se maneja mediante RBAC. |
| Control de Acceso (RBAC) estricto | ❌ Falta (crítico) | Ver sección de Roles arriba. `authMiddleware` existe pero no se aplica en la mayoría de rutas. |
| Integridad Histórica de facturas | ✅ Implementado | `Invoice.exchangeRateId` fija la tasa. Véase arriba. |

### ⚡ Rendimiento y Usabilidad

| Requisito | Estado | Detalle |
|-----------|--------|---------|
| Interfaz Intuitiva (códigos de color calendario) | ✅ Implementado | `react-big-calendar` con colores por estado (`STATUS_COLORS`). Véase: `FRONTEND-5TO/src/components/react/DoctorScheduleCalendar.tsx:96-101` |
| Disponibilidad (prevención colisiones tiempo real) | ⚚️ Parcial | Se valida `patient_limit` por franja, pero no hay constraint único ni transacción de serialización para prevenir colisiones concurrentes. Véase: `BACKEND-5TO/src/modules/scheduling/appointment/appointment.service.ts:221-238` |
| Portabilidad de Reportes (Excel/PDF profesional) | ❌ Falta | No hay generación de archivos exportables. `printInvoice.ts` usa `window.print()` (impresión del navegador, no PDF real). No hay librería de exportación. Véase: `FRONTEND-5TO/src/utils/printInvoice.ts` |

### 🇻🇪 Cumplimiento Legal (Venezuela)

| Requisito | Estado | Detalle |
|-----------|--------|---------|
| Lógica IGTF (solo efectivo + divisas) | ⚚️ Parcial | Frontend aplica la condición (cash + USD = 3%). Backend guarda el valor sin validar la condición. Véase: `FRONTEND-5TO/src/components/react/receptionist/CreateInvoiceModal.tsx:177-183` |
| Manejo de Multimoneda (pagos híbridos, tasa oficial) | ⚚️ Parcial | Existe `ExchangeRate` y conversión en frontend. **Backend tiene bug en la conversión VES→USD** (línea 232-234 de `invoice.service.ts`). No hay campo `currency` en `InvoicePayment` para saber en qué moneda se registró el pago original. |

---

## 3. Resumen Ejecutivo

### ✅ Lo que YA funciona
- Modelo de datos completo (Prisma): pacientes, doctores, citas, consultas, facturas, inventario, gastos, compras, nómina
- CRUD de citas con validación de disponibilidad por horario del doctor
- Calendario con `react-big-calendar` (vistas semana/día/agenda)
- Estados de cita con colores (Pendiente/Confirmada/Cancelada/Finalizada — estados configurables vía CRUD)
- Consulta médica con síntomas, diagnósticos, exámenes, recetas y consumo de inventario
- Facturación con tasa de cambio histórica y pagos multi-moneda
- IGTF calculado en frontend
- Reparto de honorarios (configurable por especialidad, tal como se requiere)
- Nómina devengada automática al finalizar consulta
- Gastos operativos (OPEX) + compras de insumos
- Ledger consolidado de egresos
- Login JWT + protección de rutas en frontend por rol
- Seed completo para desarrollo

### ❌ Lo que FALTA (priorizado)

**CRÍTICO (bloquea funcionalidad core)**:
1. **RBAC en backend** — Proteger todas las rutas con `authMiddleware` + middleware de autorización por rol
2. **Facturación automática al finalizar consulta** — `ConsultationService.finish()` debe crear `Invoice` proforma en la misma transacción
3. **Validación estricta de conflictos de agenda** — Impedir mismo doctor + misma hora para pacientes distintos (con constraint o transacción serializable)

**ALTO (afecta cumplimiento de requerimientos)**:
4. **Vista Mes en calendario** — Habilitar `month` view en `react-big-calendar`
5. **Alinear nombres de estados de vista** — "Pendiente" en vez de "Sin Confirmar" en el mapeo de colores del calendario (el modelo ya soporta los nombres correctos)
6. **Reportes financieros** — Cierre de caja diario, Libro de ventas, Control de honorarios por pagar

**MEDIO (funcionalidad esperada)**:
7. **Reportes operativos** — Tasa de ausentismo, Demanda por especialidad, Ocupación de agenda
8. **Exportación Excel/PDF** — Libro de ventas y otros reportes
9. **Estados financieros** — Balance General, Estado de Resultados
10. **Reporte de inventario de insumos** — Consumo basado en consultas

**BAJO (mejoras/ajustes)**:
11. **Bug conversión VES en backend** — Corregir lógica en `InvoiceService.create()` línea 232-234
12. **Campo de tratamiento explícito** — Además de `Prescription`
13. **Persistir líneas de factura (InvoiceDetail)** — Para desglose IVA y auditoría contable

---

## 4. Archivos Clave de Referencia

| Módulo | Archivo Backend | Archivo Frontend |
|--------|----------------|-----------------|
| Schema DB | `BACKEND-5TO/prisma/schema.prisma` | — |
| Citas | `BACKEND-5TO/src/modules/scheduling/appointment/` | `FRONTEND-5TO/src/components/react/AppointmentForm.tsx` |
| Calendario | — | `FRONTEND-5TO/src/components/react/DoctorScheduleCalendar.tsx` |
| Consulta | `BACKEND-5TO/src/modules/medical/consultation/consultation.service.ts` | `FRONTEND-5TO/src/pages/modules/doctor/[doctor_id]/consultation/[consultation_id].astro` |
| Facturación | `BACKEND-5TO/src/modules/finance/invoice/invoice.service.ts` | `FRONTEND-5TO/src/components/react/receptionist/CreateInvoiceModal.tsx` |
| Nómina | `BACKEND-5TO/src/modules/finance/payroll/payroll.service.ts` | `FRONTEND-5TO/src/components/react/admin/finance/PayrollDashboard.tsx` |
| Gastos | `BACKEND-5TO/src/modules/expenses/` | `FRONTEND-5TO/src/pages/modules/admin/manage-expenses.astro` |
| Ledger Egresos | `BACKEND-5TO/src/modules/report/expenseLedger/expenseLedger.service.ts` | — |
| Auth/Login | `BACKEND-5TO/src/modules/auth/login/login.service.ts` | `FRONTEND-5TO/src/lib/services/auth/auth.service.ts` |
| Middleware Auth | `BACKEND-5TO/src/middlewares/auth.middleware.ts` | `FRONTEND-5TO/src/middleware.ts` |
| Roles | `BACKEND-5TO/src/modules/auth/role/` | `FRONTEND-5TO/src/middleware.ts` |
| Inventario | `BACKEND-5TO/src/modules/inventory/` | `FRONTEND-5TO/src/pages/modules/admin/manage-supplies.astro` |
| Seed | `BACKEND-5TO/prisma/seed/` | — |
| Doc Facturación | `BACKEND-5TO/docs/finance-billing.md` | `FRONTEND-5TO/src/content/docs/docs/finance-billing.md` |
