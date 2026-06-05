import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
  BatchWriteCommand,
  TransactWriteCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';

const TABLE_NAME = process.env.TABLE_NAME || 'NHAIAttendance';
const REGION = process.env.AWS_REGION || 'ap-south-1';

const client = new DynamoDBClient({ region: REGION });
const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
    convertEmptyValues: false,
  },
});

export class AttendanceRepository {
  async putAttendanceRecord(record: Record<string, any>): Promise<void> {
    const command = new PutCommand({
      TableName: TABLE_NAME,
      Item: record,
      ConditionExpression: 'attribute_not_exists(pk)',
    });
    await docClient.send(command);
  }

  async getAttendanceRecord(id: string): Promise<Record<string, any> | null> {
    const command = new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        pk: `ATTENDANCE#${id}`,
        sk: `METADATA#${id}`,
      },
    });
    const result = await docClient.send(command);
    return result.Item || null;
  }

  async queryByUser(
    userId: string,
    limit: number = 50,
    lastKey?: Record<string, any>
  ): Promise<{ items: Record<string, any>[]; lastKey?: Record<string, any> }> {
    const command = new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'UserIdIndex',
      KeyConditionExpression: 'userId = :uid',
      ExpressionAttributeValues: {
        ':uid': userId,
      },
      Limit: limit,
      ExclusiveStartKey: lastKey,
      ScanIndexForward: false,
    });
    const result = await docClient.send(command);
    return {
      items: result.Items || [],
      lastKey: result.LastEvaluatedKey,
    };
  }

  async queryByDateRange(
    startDate: number,
    endDate: number,
    limit: number = 100
  ): Promise<Record<string, any>[]> {
    const command = new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'TimestampIndex',
      KeyConditionExpression: 'gsipk = :gpk AND #ts BETWEEN :start AND :end',
      ExpressionAttributeNames: {
        '#ts': 'timestamp',
      },
      ExpressionAttributeValues: {
        ':gpk': 'ATTENDANCE',
        ':start': startDate,
        ':end': endDate,
      },
      Limit: limit,
      ScanIndexForward: false,
    });
    const result = await docClient.send(command);
    return result.Items || [];
  }

  async batchWriteRecords(records: Record<string, any>[]): Promise<number> {
    let written = 0;
    for (let i = 0; i < records.length; i += 25) {
      const batch = records.slice(i, i + 25);
      const command = new BatchWriteCommand({
        RequestItems: {
          [TABLE_NAME]: batch.map((item) => ({
            PutRequest: { Item: item },
          })),
        },
      });
      await docClient.send(command);
      written += batch.length;
    }
    return written;
  }

  async putEmployee(employee: Record<string, any>): Promise<void> {
    const command = new PutCommand({
      TableName: TABLE_NAME,
      Item: employee,
    });
    await docClient.send(command);
  }

  async getEmployee(id: string): Promise<Record<string, any> | null> {
    const command = new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        pk: `EMPLOYEE#${id}`,
        sk: `PROFILE#${id}`,
      },
    });
    const result = await docClient.send(command);
    return result.Item || null;
  }

  async getEmployeeByName(name: string): Promise<Record<string, any> | null> {
    const command = new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'gsipk = :gpk AND gsisk = :name',
      ExpressionAttributeValues: {
        ':gpk': 'EMPLOYEE',
        ':name': name.toLowerCase(),
      },
      Limit: 1,
    });
    const result = await docClient.send(command);
    if (!result.Items || result.Items.length === 0) return null;
    return result.Items[0];
  }

  async getSyncStatus(
    userId: string
  ): Promise<{ total: number; synced: number }> {
    const result = await this.queryByUser(userId, 1000);
    const items = result.items;
    return {
      total: items.length,
      synced: items.filter((i) => i.syncStatus === 'synced').length,
    };
  }
}

export const attendanceRepo = new AttendanceRepository();
