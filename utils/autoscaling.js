var AWS = require("aws-sdk");
var async = require("neo-async");
var log = require("./log");

module.exports = function autoscaling(AwsAutoscaling, AwsEcs) {
  var autoscaling = AwsAutoscaling || new AWS.AutoScaling();
  var ecs = AwsEcs || new AWS.ECS();

  function startEcsContainer(params, cb) {
    var AutoScalingGroupName = params.AutoScalingGroupName;
    var DesiredCapacity = params.DesiredCapacity;
    var WaitPeriodMs = params.WaitPeriodMs || 1000;

    autoscaling.setDesiredCapacity(
      {
        AutoScalingGroupName,
        DesiredCapacity
      },
      function(err, data) {
        if (err) {
          cb(err);
        } else {
          log.info(
            `Successfully set AutoScaling group ${AutoScalingGroupName} to ${DesiredCapacity}.`
          );

          async.during(
            function(callback) {
              clusterContainerCountIsZero(
                { cluster: params.Cluster },
                callback
              );
            },
            function(callback) {
              setTimeout(callback, WaitPeriodMs);
            },
            function(err) {
              if (err) {
                cb(err);
              } else {
                cb();
              }
            }
          );
        }
      }
    );
  }

  function clusterContainerCountIsZero(params, cb) {
    log.info(
      `Polling ECS cluster ${
        params.cluster
      } to check container count is positive`
    );
    ecs.describeClusters(
      {
        clusters: [params.cluster]
      },
      function(err, data) {
        if (err) {
          cb(err);
        } else {
          var containerCount =
            data.clusters[0].registeredContainerInstancesCount;
          log.info(`Container count is ${containerCount}`);
          if (containerCount == 0) {
            cb(null, true);
          } else {
            cb(null, false);
          }
        }
      }
    );
  }

  return {
    startEcsContainer
  };
};
