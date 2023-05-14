import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { createWorkoutSchema } from "../../workout/create-workout-dto";

export class UserStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const publicApi = cdk.aws_apigateway.RestApi.fromRestApiAttributes(
      this,
      "ApiReference",
      {
        rootResourceId: cdk.Fn.importValue("PublicApiRootResourceId"),
        restApiId: cdk.Fn.importValue("PublicApiId"),
      }
    );

    const userAuthorizer = {
      authorizerId: cdk.Fn.importValue("UserAuthorizerId"),
      authorizationType: cdk.aws_apigateway.AuthorizationType.COGNITO,
    };

    const userTable = new cdk.aws_dynamodb.Table(this, "UserTable", {
      partitionKey: {
        name: "userId",
        type: cdk.aws_dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: "item",
        type: cdk.aws_dynamodb.AttributeType.STRING,
      },
    });

    const startFunction = new cdk.aws_lambda.Function(this, "StartFunction", {
      code: new cdk.aws_lambda.AssetCode("dist/user-info"),
      runtime: cdk.aws_lambda.Runtime.NODEJS_18_X,
      handler: "start-handler.handler",
    });

    userTable.grantReadWriteData(startFunction);

    publicApi.root
      .addResource("user")
      .addMethod(
        "POST",
        new cdk.aws_apigateway.LambdaIntegration(startFunction),
        {
          authorizer: userAuthorizer,
          authorizationScopes: ["com.workout/user"],
        }
      );

    const createWorkoutFunction = new cdk.aws_lambda.Function(
      this,
      "CreateWorkoutFunction",
      {
        code: new cdk.aws_lambda.AssetCode("dist/workout"),
        runtime: cdk.aws_lambda.Runtime.NODEJS_18_X,
        handler: "create-workout-handler.handler",
        environment: {
          USER_TABLE_NAME: userTable.tableName,
        },
      }
    );

    userTable.grantWriteData(createWorkoutFunction);

    publicApi.root
      .addResource("workout")
      .addMethod(
        "POST",
        new cdk.aws_apigateway.LambdaIntegration(createWorkoutFunction),
        {
          authorizer: userAuthorizer,
          authorizationScopes: ["com.workout/user"],
          requestValidator: new cdk.aws_apigateway.RequestValidator(
            this,
            "CreateWorkoutRequestValidator",
            { restApi: publicApi, validateRequestBody: true }
          ),
          requestModels: {
            "application/json": new cdk.aws_apigateway.Model(
              this,
              "CreateWorkoutRequestModel",
              {
                schema: createWorkoutSchema as any,
                restApi: publicApi,
              }
            ),
          },
        }
      );
  }
}
