var assert = require('chai').assert
var autoscaling = require('../utils/autoscaling')

describe('autoscaling', function() {
  it('should use AutoScaling to set desired capacity to the specified capacity', function(done) {
    var mockAwsAutoscaling = MockAwsAutoscaling({})
    var mockAwsEcs = MockAwsEcs([{ data: MockAwsEcsDescriptionResponse(1) }])

    var as = autoscaling(mockAwsAutoscaling, mockAwsEcs)

    as.startEcsContainer({
      AutoScalingGroupName: 'MockAutoScalingGroupName',
      DesiredCapacity: 1,
      Cluster: 'MockCluster'
    }, function (err, result) {
      try {
        assert.equal(mockAwsAutoscaling.params.AutoScalingGroupName, 'MockAutoScalingGroupName')
        assert.equal(mockAwsAutoscaling.params.DesiredCapacity, 1)
        assert.equal(mockAwsEcs.params[0].clusters[0], 'MockCluster')
        done()
      } catch (err) {
        done(err)
      }
    })
  })

  it('should wait for the describe clusters to response with a positive container count', function(done) {
    var mockAwsAutoscaling = MockAwsAutoscaling({})
    var mockAwsEcs = MockAwsEcs([
      { data: MockAwsEcsDescriptionResponse(0) },
      { data: MockAwsEcsDescriptionResponse(0) },
      { data: MockAwsEcsDescriptionResponse(1) }
    ])

    var as = autoscaling(mockAwsAutoscaling, mockAwsEcs)

    as.startEcsContainer({
      AutoScalingGroupName: 'MockAutoScalingGroupName',
      DesiredCapacity: 1,
      Cluster: 'MockCluster',
      WaitPeriodMs: 1
    }, function (err, result) {
      try {
        assert.equal(mockAwsEcs.params.length, 3)
        done()
      } catch (err) {
        done(err)
      }
    })
  })

  it('should stop on an error when setting desired capacity', function(done) {
    var mockAwsAutoscaling = MockAwsAutoscaling({
      err: new Error('mock error setting capacity')
    })
    var mockAwsEcs = MockAwsEcs()

    var as = autoscaling(mockAwsAutoscaling, mockAwsEcs)

    as.startEcsContainer({
      AutoScalingGroupName: 'MockAutoScalingGroupName',
      DesiredCapacity: 1,
      Cluster: 'MockCluster'
    }, function (err, result) {
      try {
        assert.equal(err.message, 'mock error setting capacity')
        done()
      } catch (err) {
        done(err)
      }
    })
  })

  it('should stop on an error when describing clusters the first time', function (done) {
    var mockAwsAutoscaling = MockAwsAutoscaling({})
    var mockAwsEcs = MockAwsEcs([{ err: new Error('mock error describing clusters') }])

    var as = autoscaling(mockAwsAutoscaling, mockAwsEcs)

    as.startEcsContainer({
      AutoScalingGroupName: 'MockAutoScalingGroupName',
      DesiredCapacity: 1,
      Cluster: 'MockCluster'
    }, function (err, result) {
      try {
        assert.equal(err.message, 'mock error describing clusters')
        done()
      } catch (err) {
        done(err)
      }
    })
  })

  it('should stop on an error when describing clusters subsequent times', function (done) {
    var mockAwsAutoscaling = MockAwsAutoscaling({})
    var mockAwsEcs = MockAwsEcs([
      { data: MockAwsEcsDescriptionResponse(0) },
      { err: new Error('mock error describing clusters') }
    ])

    var as = autoscaling(mockAwsAutoscaling, mockAwsEcs)

    as.startEcsContainer({
      AutoScalingGroupName: 'MockAutoScalingGroupName',
      DesiredCapacity: 1,
      Cluster: 'MockCluster',
      WaitPeriodMs: 1
    }, function (err, result) {
      try {
        assert.equal(err.message, 'mock error describing clusters')
        done()
      } catch (err) {
        done(err)
      }
    })
  })
})

function MockAwsAutoscaling(result) {
  var params = {}

  function setDesiredCapacity(p, cb) {
    params.AutoScalingGroupName = p.AutoScalingGroupName
    params.DesiredCapacity = p.DesiredCapacity

    cb(result.err, result.data);
  }
  
  return {
    setDesiredCapacity,
    params,
    result
  }
}

function MockAwsEcs(results) {
  var params = []

  function describeClusters(p, cb) {
    params.push(p)
    var result = results.shift() || cb(new Error('More calls than expected to describeCluster'))
    cb(result.err, result.data)
  }

  return {
    describeClusters,
    results,
    params
  }
}

function MockAwsEcsDescriptionResponse(registeredContainers) {
  return {
    clusters: [
      {
        registeredContainerInstancesCount: registeredContainers
      }
    ]
  }
}