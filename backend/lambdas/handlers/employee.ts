import { Context } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import { attendanceRepo } from '../services/dynamodb';
import { EmployeeInput } from '../models/attendance';
import { withAuth, AuthenticatedEvent } from '../middleware/auth';
import { ok, created, badRequest, notFound, serverError, parseBody } from '../middleware/response';

export const registerEmployee = withAuth(async (event: AuthenticatedEvent, _context: Context) => {
  try {
    const body = parseBody(event);
    if (!body) {
      return badRequest('Invalid request body');
    }

    const input: EmployeeInput = {
      id: body.id,
      name: body.name,
      designation: body.designation,
      department: body.department,
      phone: body.phone,
      email: body.email,
    };

    if (!input.name || !input.designation || !input.department) {
      return badRequest('Missing required fields: name, designation, department');
    }

    const now = Date.now();
    const id = input.id || `emp_${now}_${uuidv4().slice(0, 8)}`;

    const record = {
      pk: `EMPLOYEE#${id}`,
      sk: `PROFILE#${id}`,
      gsipk: 'EMPLOYEE',
      gsisk: `${input.name.toLowerCase()}`,
      id,
      name: input.name,
      designation: input.designation,
      department: input.department,
      phone: input.phone || '',
      email: input.email || '',
      faceRegistered: false,
      registeredAt: now,
      updatedAt: now,
      active: true,
    };

    await attendanceRepo.putEmployee(record);

    return created({
      message: 'Employee registered successfully',
      id,
      name: input.name,
      designation: input.designation,
      department: input.department,
    });
  } catch (error) {
    return serverError(error);
  }
});

export const getEmployee = withAuth(async (event: AuthenticatedEvent, _context: Context) => {
  try {
    const employeeId = event.pathParameters?.id;
    if (!employeeId) {
      return badRequest('Employee ID is required');
    }

    const employee = await attendanceRepo.getEmployee(employeeId);
    if (!employee) {
      return notFound(`Employee ${employeeId} not found`);
    }

    return ok({
      id: employee.id,
      name: employee.name,
      designation: employee.designation,
      department: employee.department,
      phone: employee.phone,
      email: employee.email,
      faceRegistered: employee.faceRegistered,
      registeredAt: employee.registeredAt,
      active: employee.active,
    });
  } catch (error) {
    return serverError(error);
  }
});

export const updateEmployee = withAuth(async (event: AuthenticatedEvent, _context: Context) => {
  try {
    const employeeId = event.pathParameters?.id;
    if (!employeeId) {
      return badRequest('Employee ID is required');
    }

    const existing = await attendanceRepo.getEmployee(employeeId);
    if (!existing) {
      return notFound(`Employee ${employeeId} not found`);
    }

    const body = parseBody(event);
    if (!body) {
      return badRequest('Invalid request body');
    }

    const now = Date.now();
    const updatedRecord = {
      ...existing,
      name: body.name ?? existing.name,
      designation: body.designation ?? existing.designation,
      department: body.department ?? existing.department,
      phone: body.phone ?? existing.phone,
      email: body.email ?? existing.email,
      faceRegistered: body.faceRegistered ?? existing.faceRegistered,
      updatedAt: now,
    };

    await attendanceRepo.putEmployee(updatedRecord);

    return ok({
      message: 'Employee updated successfully',
      id: employeeId,
      updatedAt: now,
    });
  } catch (error) {
    return serverError(error);
  }
});

export const deleteEmployee = withAuth(async (event: AuthenticatedEvent, _context: Context) => {
  try {
    const employeeId = event.pathParameters?.id;
    if (!employeeId) {
      return badRequest('Employee ID is required');
    }

    const existing = await attendanceRepo.getEmployee(employeeId);
    if (!existing) {
      return notFound(`Employee ${employeeId} not found`);
    }

    await attendanceRepo.putEmployee({
      ...existing,
      active: false,
      updatedAt: Date.now(),
    });

    return ok({ message: 'Employee deactivated', id: employeeId });
  } catch (error) {
    return serverError(error);
  }
});
