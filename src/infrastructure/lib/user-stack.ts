import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";

export class UserStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const api = new cdk.aws_apigateway.RestApi(this, "UserApi", {});

    new cdk.CfnOutput(this, "ApiId", {
      value: api.restApiId,
    });

    new cdk.CfnOutput(this, "ApiRootResourceId", {
      value: api.restApiRootResourceId,
    });

    const userTable = new cdk.aws_dynamodb.Table(this, "UserTable", {
      partitionKey: { name: "id", type: cdk.aws_dynamodb.AttributeType.STRING },
    });

    const startFunction = new cdk.aws_lambda.Function(this, "StartFunction", {
      code: new cdk.aws_lambda.AssetCode("dist"),
      runtime: cdk.aws_lambda.Runtime.NODEJS_18_X,
      handler: "start.handler",
    });

    userTable.grantReadWriteData(startFunction);

    api.root.addMethod(
      "POST",
      new cdk.aws_apigateway.LambdaIntegration(startFunction)
    );
  }
}
