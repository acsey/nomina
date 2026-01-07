-- Script SQL para insertar registros de asistencia
-- Ejecutar en la base de datos PostgreSQL

-- Primero, verificar que existen empleados
DO $$
DECLARE
    emp RECORD;
    work_date DATE;
    check_in_time TIMESTAMP;
    check_out_time TIMESTAMP;
    break_start_time TIMESTAMP;
    break_end_time TIMESTAMP;
    hours_worked DECIMAL(5,2);
    attendance_status TEXT;
    random_minutes INTEGER;
    random_check_out_hour INTEGER;
    day_counter INTEGER;
    is_today BOOLEAN;
    records_created INTEGER := 0;
BEGIN
    RAISE NOTICE 'Iniciando creación de registros de asistencia...';

    -- Loop through all active employees
    FOR emp IN SELECT id, first_name, last_name FROM employees WHERE is_active = true LOOP
        -- Generate attendance for last 15 work days
        FOR day_counter IN 0..14 LOOP
            work_date := CURRENT_DATE - day_counter;

            -- Skip weekends
            IF EXTRACT(DOW FROM work_date) IN (0, 6) THEN
                CONTINUE;
            END IF;

            is_today := work_date = CURRENT_DATE;

            -- 10% chance to be absent (except today)
            IF NOT is_today AND random() < 0.1 THEN
                CONTINUE;
            END IF;

            -- Random check-in time (7:45 to 8:20)
            random_minutes := floor(random() * 35) - 15;
            IF random_minutes < 0 THEN
                check_in_time := work_date + (TIME '07:00' + (60 + random_minutes) * INTERVAL '1 minute');
            ELSE
                check_in_time := work_date + (TIME '08:00' + random_minutes * INTERVAL '1 minute');
            END IF;
            -- Add random seconds
            check_in_time := check_in_time + (floor(random() * 60) * INTERVAL '1 second');

            -- Set status based on check-in time
            IF EXTRACT(HOUR FROM check_in_time::TIME) > 8 OR
               (EXTRACT(HOUR FROM check_in_time::TIME) = 8 AND EXTRACT(MINUTE FROM check_in_time::TIME) > 5) THEN
                attendance_status := 'LATE';
            ELSE
                attendance_status := 'PRESENT';
            END IF;

            IF is_today THEN
                -- Today: only check-in, no check-out yet
                check_out_time := NULL;
                break_start_time := NULL;
                break_end_time := NULL;
                hours_worked := NULL;
            ELSE
                -- Past days: include check-out and break
                break_start_time := work_date + TIME '13:00' + (floor(random() * 15) * INTERVAL '1 minute');
                break_end_time := work_date + TIME '14:00' + (floor(random() * 15) * INTERVAL '1 minute');

                random_check_out_hour := 17 + floor(random() * 2);
                check_out_time := work_date + (random_check_out_hour * INTERVAL '1 hour') + (floor(random() * 60) * INTERVAL '1 minute');

                -- Calculate hours worked
                hours_worked := ROUND(
                    (EXTRACT(EPOCH FROM (check_out_time - check_in_time)) -
                     EXTRACT(EPOCH FROM (break_end_time - break_start_time))) / 3600, 2
                );
            END IF;

            -- Insert or update attendance record
            INSERT INTO attendance_records (
                id, employee_id, date, check_in, check_out,
                break_start, break_end, status, hours_worked,
                created_at, updated_at
            )
            VALUES (
                gen_random_uuid(), emp.id, work_date, check_in_time, check_out_time,
                break_start_time, break_end_time, attendance_status, hours_worked,
                NOW(), NOW()
            )
            ON CONFLICT (employee_id, date)
            DO UPDATE SET
                check_in = EXCLUDED.check_in,
                check_out = EXCLUDED.check_out,
                break_start = EXCLUDED.break_start,
                break_end = EXCLUDED.break_end,
                status = EXCLUDED.status,
                hours_worked = EXCLUDED.hours_worked,
                updated_at = NOW();

            records_created := records_created + 1;
        END LOOP;
    END LOOP;

    RAISE NOTICE '✅ % registros de asistencia creados/actualizados', records_created;
END $$;

-- Mostrar resumen
SELECT
    c.name as empresa,
    COUNT(ar.id) as total_registros,
    COUNT(DISTINCT ar.employee_id) as empleados_con_asistencia,
    COUNT(CASE WHEN ar.date = CURRENT_DATE THEN 1 END) as registros_hoy
FROM attendance_records ar
JOIN employees e ON ar.employee_id = e.id
JOIN companies c ON e.company_id = c.id
GROUP BY c.name
ORDER BY c.name;
