import { Context } from 'aws-lambda';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { attendanceRepo } from '../services/dynamodb';
import { generateToken } from '../middleware/auth';
import { ok, badRequest, serverError, parseBody } from '../middleware/response';

export const loginHandler = async (event: any, _context: Context) => {
  try {
    const body = parseBody(event);
    if (!body || !body.name || !body.password) {
      return badRequest('Missing required fields: name, password');
    }

    const employee = await attendanceRepo.getEmployeeByName(body.name);
    if (!employee) {
      return badRequest('Invalid name or password');
    }

    if (!employee.active) {
      return badRequest('Account is deactivated');
    }

    const passwordValid = await bcrypt.compare(body.password, employee.password || '');
    if (!passwordValid) {
      return badRequest('Invalid name or password');
    }

    const token = generateToken({
      userId: employee.id,
      groups: ['employee'],
    });

    return ok({
      token,
      user: {
        id: employee.id,
        name: employee.name,
        designation: employee.designation,
        department: employee.department,
        email: employee.email,
        faceRegistered: employee.faceRegistered || false,
      },
    });
  } catch (error) {
    return serverError(error);
  }
};

export const registerHandler = async (event: any, _context: Context) => {
  try {
    const body = parseBody(event);
    if (!body) {
      return badRequest('Invalid request body');
    }

    if (!body.name || !body.password || !body.designation || !body.department) {
      return badRequest('Missing required fields: name, password, designation, department');
    }

    const existing = await attendanceRepo.getEmployeeByName(body.name);
    if (existing) {
      return badRequest('An employee with this name already exists');
    }

    const now = Date.now();
    const id = `emp_${now}_${uuidv4().slice(0, 8)}`;
    const hashedPassword = await bcrypt.hash(body.password, 10);

    const record = {
      pk: `EMPLOYEE#${id}`,
      sk: `PROFILE#${id}`,
      gsipk: 'EMPLOYEE',
      gsisk: `${body.name.toLowerCase()}`,
      id,
      name: body.name,
      designation: body.designation,
      department: body.department,
      phone: body.phone || '',
      email: body.email || '',
      password: hashedPassword,
      faceRegistered: false,
      registeredAt: now,
      updatedAt: now,
      active: true,
    };

    await attendanceRepo.putEmployee(record);

    const token = generateToken({
      userId: id,
      groups: ['employee'],
    });

    return ok({
      token,
      user: {
        id,
        name: body.name,
        designation: body.designation,
        department: body.department,
        email: body.email || '',
        faceRegistered: false,
      },
    });
  } catch (error) {
    return serverError(error);
  }
};
