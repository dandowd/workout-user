import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
} from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";

const TABLE: string = process.env.USER_TABLE_NAME!;

const ddbClient = new DynamoDBClient({});

const docClient = DynamoDBDocumentClient.from(ddbClient);

export class UserTableItem<TItem> {
  constructor(
    private readonly userId: string,
    private readonly itemType: string,
    private readonly getId: (item: TItem) => string
  ) {}

  public async get(id: string): Promise<TItem> {
    const item = await docClient.send(
      new GetItemCommand({
        TableName: TABLE,
        Key: marshall({ id: this.userId, item: `${this.itemType}#${id}` }),
      })
    );

    if (!item.Item) {
      throw new Error(`Item not found with id: ${id}`);
    }

    return unmarshall(item.Item) as TItem;
  }

  public async put(item: TItem): Promise<void> {
    await docClient.send(
      new PutItemCommand({
        TableName: TABLE,
        Item: marshall({
          id: this.userId,
          item: `${this.itemType}#${this.getId(item)}`,
          ...item,
        }),
      })
    );
  }
}
